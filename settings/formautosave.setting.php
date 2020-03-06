<?php

use CRM_Formautosave_ExtensionUtil as E;

return [
  'formautosave_enable_forms' => [
    'group_name' => E::ts('Formautosave Settings'),
    'group' => 'formautosave',
    'name' => 'formautosave_enable_forms',
    'type' => 'String',
    'add' => '1.0',
    'default' => '',
    'title' => E::ts('Enable only on the following forms'),
    'is_domain' => 1,
    'is_contact' => 0,
    'description' => E::ts('Separate form names by comma'),
    'html_type' => 'Text',
    'html_attributes' => [
      'size' => 120,
    ],
    'quick_form_type' => 'Element',
  ],
  'formautosave_disable_forms' => [
    'group_name' => E::ts('Formautosave Settings'),
    'group' => 'formautosave',
    'name' => 'formautosave_disable_forms',
    'type' => 'String',
    'add' => '1.0',
    'default' => '',
    'title' => E::ts('Disable on the following forms'),
    'is_domain' => 1,
    'is_contact' => 0,
    'description' => E::ts('Separate form names by comma'),
    'html_type' => 'Text',
    'html_attributes' => [
      'size' => 120,
    ],
    'quick_form_type' => 'Element',
  ],
];
