<?php

class CRM_Formautosave_BAO_Formautosave {

  /**
   *
   */
  static public function get($params) {
    $results = [];

    // FIXME: Just testing.. obviously not right.
    $where = $params->getWhere();
    $params = [];

    $contact_id = CRM_Core_Session::singleton()->get('userID');

    foreach ($where as $w) {
      $params[$w[0]] = $w[2];
    }

    // FIXME: allow optional 'id', presumably better with a DAO
    if (empty($params['id'])) {
      return $results;
    }

    // This is because of the string validation, but the condition should be removed if empty.
    $key = $params['share_key'] ?: ' ';

    $dao = CRM_Core_DAO::executeQuery('SELECT *
      FROM civicrm_dataexplorer
      WHERE id = %1
        AND (contact_id = %2 OR (share_enabled = 1 AND share_key IS NOT NULL AND share_key <> "" AND share_key = %3 AND share_expire_date > NOW()))', [
      1 => [$params['id'], 'Positive'],
      2 => [$contact_id, 'Positive'],
      3 => [$key, 'String'],
    ]);

    if ($dao->fetch()) {
      $results[] = [
        'id' => $dao->id,
        'contact_id' => $dao->contact_id,
        'data' => $dao->data,
        'share_enabled' => $dao->share_enabled,
        'share_key' => $dao->share_key,
        'share_expire_date' => ($dao->share_expire_date ? substr($dao->share_expire_date, 0, 10) : ''),
      ];
    }

    return $results;
  }

  /**
   *
   */
  static public function create($params) {
    $check_permissions = false;
    $ids = CRM_Contact_BAO_Contact::getDuplicateContacts($params, $params['contact_type'], 'Unsupervised', [], $check_permissions);

    $contact_id = (!empty($ids[0]) ? $ids[0] : null);

    if (empty($contact_id)) {
      if ($params['contact_type'] == 'Individual') {
        if (empty($params['first_name']) || empty($params['last_name']) || empty($params['email'])) {
          throw new Exception("Missing one of: first_name, last_name, email.");
        }

        $result = \Civi\Api4\Contact::create()
          ->addValue('contact_type', 'Individual')
          ->addValue('first_name', $params['first_name'])
          ->addValue('last_name', $params['last_name'])
          ->addValue('email', $params['email'])
          ->setCheckPermissions(false)
          ->execute()
          ->first();

        $contact_id = $result['id'];
      }
      elseif ($params['contact_type'] == 'Organization') {
        if (empty($params['organization_name']) || empty($params['email'])) {
          throw new Exception("Missing one of: organization_name, email.");
        }

        $result = \Civi\Api4\Contact::create()
          ->addValue('contact_type', 'Organization')
          ->addValue('organization_name', $params['organization_name'])
          ->addValue('email', $params['email'])
          ->setCheckPermissions(false)
          ->execute()
          ->first();

        $contact_id = $result['id'];
      }
      else {
        throw new Exception("Unhandled Contact Type");
      }
    }

    // Create an activity
    try {
      $atype = civicrm_api3('OptionValue', 'getsingle', [
        'option_group_id' => 'activity_type',
        'name' => 'Form Autosave',
      ])['value'];

      $result = \Civi\Api4\Activity::create()
        ->addValue('source_contact_id', $contact_id)
        ->addValue('activity_type_id', $atype)
        ->setCheckPermissions(false)
        ->execute()
        ->first();

      return $contact_id . '-' . $result['id'];
    }
    catch (Exception $e) {
      Civi::log()->error('formautosave: failed to create an activity: ' . $e->getMessage());
    }

    return null;
  }

  /**
   *
   */
  static public function update($params) {
    $contact_id = CRM_Core_Session::singleton()->get('userID');

    // Validate the contact_id
    $creator_contact_id = CRM_Core_DAO::singleValueQuery('SELECT contact_id FROM civicrm_dataexplorer WHERE id = %1', [
      1 => [$params['id'], 'Positive'],
    ]);

    if ($creator_contact_id != $contact_id) {
      throw new \Exception('Access denied - You are not the creator of this visualisation. ' . $contact_id . ' -- ' . $creator_contact_id);
    }

    // FIXME sloppy copy-paste
    $data = json_encode($params['data']);

    CRM_Core_DAO::executeQuery('UPDATE civicrm_dataexplorer SET data = %1 WHERE id = %2', [
      1 => [$data, 'String'],
      2 => [$params['id'], 'Positive'],
    ]);

    if (!empty($params['share_enabled'])) {
      CRM_Core_DAO::executeQuery('UPDATE civicrm_dataexplorer SET share_enabled = %1 WHERE id = %2', [
        1 => [$params['share_enabled'], 'Boolean'],
        2 => [$params['id'], 'Positive'],
      ]);
    }

    if (!empty($params['share_key'])) {
      CRM_Core_DAO::executeQuery('UPDATE civicrm_dataexplorer SET share_key = %1 WHERE id = %2', [
        1 => [$params['share_key'], 'String'],
        2 => [$params['id'], 'Positive'],
      ]);
    }

    if (!empty($params['share_expire_date'])) {
      $date = substr($params['share_expire_date'], 0, 10) . ' 23:59:59';

      CRM_Core_DAO::executeQuery('UPDATE civicrm_dataexplorer SET share_expire_date = %1 WHERE id = %2', [
        1 => [$date, 'String'],
        2 => [$params['id'], 'Positive'],
      ]);
    }

    return $params['id'];
  }

}
