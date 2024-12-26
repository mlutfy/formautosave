<?php

require_once 'formautosave.civix.php';
use CRM_Formautosave_ExtensionUtil as E;

/**
 * Implementation of hook_civicrm_config
 */
function formautosave_civicrm_config(&$config) {
  _formautosave_civix_civicrm_config($config);
}

/**
 * Implementation of hook_civicrm_install
 */
function formautosave_civicrm_install() {
  $gid = \Civi\Api4\OptionGroup::get()
    ->setSelect(['id'])
    ->addWhere('name', '=', 'activity_type')
    ->setCheckPermissions(false)
    ->execute()
    ->first()['id'];

  $value = CRM_Core_DAO::singleValueQuery('SELECT max(cast(value as unsigned)) + 1 as v FROM civicrm_option_value WHERE option_group_id = %1', [
    1 => [$gid, 'Positive'],
  ]);

  $results = \Civi\Api4\OptionValue::create()
    ->addValue('option_group_id', $gid)
    ->addValue('name', 'Form Autosave')
    ->addValue('label', E::ts('Form Autosave'))
    ->addValue('value', $value)
    ->addValue('is_reserved', 1)
    ->addValue('is_active', 1)
    ->setCheckPermissions(false)
    ->execute();

  return _formautosave_civix_civicrm_install();
}

/**
 * Implementation of hook_civicrm_enable
 */
function formautosave_civicrm_enable() {
  return _formautosave_civix_civicrm_enable();
}

/**
 * Implements hook_civicrm_buildForm().
 */
function formautosave_civicrm_buildForm($formName, &$form) {
  // Do not load if being called from a snippet (assuming custom group).
  if (CRM_Utils_Request::retrieve('snippet', 'String') == 4) {
    return;
  }

  // Avoid loading the .js twice, which would formautosave init twice
  // with double-binding of events, etc.
  if ($formName == 'CRM_Custom_Form_CustomDataByType') {
    return;
  }

  $allow = Civi::settings()->get('formautosave_enable_forms');
  $deny = Civi::settings()->get('formautosave_disable_forms');
  $remotesave = Civi::settings()->get('formautosave_remotesave_forms');

  if ($allow) {
    $forms = explode(',', $allow);

    if (!in_array($formName, $forms)) {
      return;
    }
  }

  if ($deny) {
    $forms = explode(',', $deny);

    if (in_array($formName, $forms)) {
      return;
    }
  }

  $is_remotesave = false;

  if ($remotesave) {
    $forms = explode(',', $remotesave);
    $is_remotesave = in_array($formName, $forms);
  }

  CRM_Core_Resources::singleton()
    ->addScriptFile('ca.bidon.formautosave', 'formautosave.js')
    ->addStyleFile('ca.bidon.formautosave', 'formautosave.css')
    ->addScriptFile('ca.bidon.formautosave', '/dist/filesaver/FileSaver.min.js');

  // By default the key used is the form name, but this can be very annoying in
  // some circumstances, such as in Case Activities, where we know that the
  // contact_id could be used to avoid restoring info from another case.
  //
  // The JS will default to the form#ID (Ex: Activity), and will append the
  // keysuffix to that ID, so that in a Case Activity, it will be, for example,
  // Activity,12,23, where 12 is the contact_id, and 23 the case_id.
  //
  // The .js determine the form#ID, because a page can have multiple forms.
  //
  // NB: items are saved in the storage with the key:
  // form_id|input_id

  $keysuffix = '';

  if ($formName == 'CRM_Case_Form_Activity') {
    $contact_id = CRM_Utils_Array::value('cid', $_REQUEST);
    $case_id = CRM_Utils_Array::value('caseid', $_REQUEST);

    $keysuffix = "$contact_id,$case_id";
  }

  CRM_Core_Resources::singleton()->addSetting([
    'formautosave' => [
      'keysuffix' => $keysuffix,
      'remotesave' => $is_remotesave,
      'remotesave_cid' => 0,
      'remotesave_aid' => 0,
      'remotesave_cs' => '',
    ],
  ]);
}
