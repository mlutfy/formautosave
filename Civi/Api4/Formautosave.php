<?php

namespace Civi\Api4;

/**
 * Formautosave entity.
 *
 * Based on the 'Mock' entities from api4 until we create proper DAO/BAOs.
 *
 * @package Civi\Api4
 */
class Formautosave extends Generic\AbstractEntity {

  /**
   * @return Generic\BasicGetFieldsAction
   */
  public static function getFields() {
    return new Generic\BasicGetFieldsAction(static::class, __FUNCTION__, function() {
      return [
        [
          'name' => 'id',
          'type' => 'Integer',
        ],
        [
          'name' => 'contact_id',
          'type' => 'Integer',
        ],
        [
          'name' => 'contact_type',
          'type' => 'String',
        ],
        [
          'name' => 'cs',
          'type' => 'String',
        ],
        [
          'name' => 'organization_name',
          'type' => 'String',
        ],
        [
          'name' => 'email',
          'type' => 'String',
        ],
        [
          'name' => 'first_name',
          'type' => 'String',
        ],
        [
          'name' => 'last_name',
          'type' => 'String',
        ],
      ];
    });
  }

  /**
   * @return Generic\BasicGetAction
   */
  public static function get() {
    return new Generic\BasicGetAction('Formautosave', __FUNCTION__, [\CRM_Formautosave_BAO_Formautosave::CLASS, 'get']);
  }

  /**
   * @return Generic\BasicCreateAction
   */
  public static function create() {
    return new Generic\BasicCreateAction('Formautosave', __FUNCTION__, [\CRM_Formautosave_BAO_Formautosave::CLASS, 'create']);
  }

  /**
   * @return Generic\BasicUpdateAction
   */
  public static function update() {
    return new Generic\BasicUpdateAction('Formautosave', __FUNCTION__, 'id', [\CRM_Formautosave_BAO_Formautosave::CLASS, 'update']);
  }

  /**
   * @inheritDoc
   */
  public static function permissions() {
    return [
      'default' => ['access AJAX API'],
    ];
  }

}
