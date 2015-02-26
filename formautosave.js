
// FIXME: when a new form page is loaded, it will automatically start
// auto-saving the field values. We only save fields with data, but that
// means that if a field has a default value, it will erase the previously
// saved value. It's not a big deal, but check if wysiwyg fields work?
//
// We have no reliable way of clearing the saved data, and no data
// separation between form instances of the same type.
//
// Data is saved per-form, so if the use has two form#Activity open,
// they will both save in the same data space. For different activity
// types, this mostly affects the fields that are common to both.
// If the activity type is the same, it will give unreliable results.

(function($, _, ts){
  if (typeof localStorage != 'object') {
    console.log('Warning: localStorage not supported by browser. CiviCRM form auto-save will not work. Please upgrade to the latest version of your browser.');
    return;
  }

  $(function($) {
    $('.crm-container form').not('#id_search_block').each(function() {
      var form_id = $(this).attr('id');
      CRM.formautosaveInit(form_id);
    });

    // Bind the click event on the 'restore' link.
    // Done outside the loop in case there are multiple forms in the page.
    $('.crm-formautosave-restore a').click(function(event) {
      // Extract the form_id from, for example, '#Activity'
      // I avoided putting just 'Activity' as the href, since it could be really
      // confusing if javascript is buggy, or middle-click.
      var id = cj(this).attr('href').substr(1);
      CRM.formautosaveRestore(id);

      event.preventDefault();
      return false;
    });

    // Bind the click event to the 'clear' link.
    $('.crm-formautosave-clear a').click(function(event) {
      // Extract the form_id from, for example, '#Activity'
      // I avoided putting just 'Activity' as the href, since it could be really
      // confusing if javascript is buggy, or middle-click.
      var id = cj(this).attr('href').substr(1);
      CRM.formautosaveClear(id, false);

      event.preventDefault();
      return false;
    });

    // This is a bit silly, but we will wait 5 seconds before enabling.
    // On some forms, a lot of things happen at load time, so it can cause
    // false 'on change' events to be captured, and browser overload.
    setInterval(function(){
      $('.crm-container form').not('#id_search_block').each(function() {
        var form_id = $(this).attr('id');
        CRM.formautosaveEnable(form_id);
      });
    }, 5000);
  });

  CRM.formautosaveInit = function(form_id) {
    // usually should translate Case, Activity, but will not always work (ex: CustomData) since not in .po files
    var $this = $('#' + form_id);

    // NB: the click event is binded outside the loop, to avoid binding multiple times
    $this.prepend('<div class="crm-formautosave-restore"><a href="#' + form_id +'">' + ts('Restore %1', { 1: ts(form_id) }) + '</a></div>');

    // Link to clear/delete the saved form data
    var class_name = 'crm-formautosave-counter-' + form_id;
    $this.prepend('<div class="crm-formautosave-clear"><a href="#' + form_id + '">' + ts('Clear') + ' (<span class="' + class_name + '"></span>)</a></div>');
    CRM.formautosaveUpdateCount(form_id);
  }

  CRM.formautosaveEnable = function(form_id) {
    // When a first element is changed, start the autosave,
    // and flush the old form data.
    cj('#' + form_id + ' input.form-text').one('change', function() {
      var key = form_id;
      if (CRM.formautosave.keysuffix) {
        key += ',' + CRM.formautosave.keysuffix;
      }
      console.log('FLUSHING ' + key);
      CRM.formautosaveClear(key, true);

      // Save the form values every 10 seconds
      setInterval(function(){
        try {
          CRM.formautosaveSave(form_id);
        }
        catch (error) {
          CRM.alert(ts('Your disk local storage was full. This is used for auto-saving CiviCRM forms. It has been automatically cleared. The exact error was:') + ' ' + error, '', 'ok');
          CRM.formautosaveClear('', true);
          CRM.formautosaveSave(form_id);
        }
      }, 10000);
    });
  };

  CRM.formautosaveSave = function(form_id) {
    // Save each form with a separate key
    // Makes it easier to restore one form but not another.
    var items_saved = 0;

    $('.crm-container form input').each(function() {
      // Avoid saving submit buttons, and make sure the 'id' is defined
      if (! $(this).hasClass('form-submit') && $(this).attr('id')) {
        items_saved += CRM.formautosaveSaveElement(form_id, $(this));
      }
    });

    $('.crm-container form select').each(function() {
      items_saved += CRM.formautosaveSaveElement(form_id, $(this));
    });

    $('.crm-container form textarea').each(function() {
      items_saved += CRM.formautosaveSaveElement(form_id, $(this));
    });

    // Update the saved items counter
    CRM.formautosaveUpdateCount(form_id);
  };

  CRM.formautosaveSaveElement = function(form_id, e) {
    var input_id = e.attr('id');

    // Build the localStorage key
    var key = form_id;

    if (CRM.formautosave.keysuffix) {
      key += ',' + CRM.formautosave.keysuffix;
    }

    key += '|' + input_id;

    // Never save credit card data on disk
    if (input_id == 'credit_card_number' || input_id == 'cvv2' || input_id == 'credit_card_exp_date[M]' || input_id == 'credit_card_exp_date[Y]') {
      return 0;
    }

    if (e.attr('type') == 'checkbox') {
      if (e.prop('checked')) {
        console.log(form_id + ' : saving : ' + key + ' = checked');
        localStorage.setItem(key, 'checked');
      }
      else {
        if (localStorage.getItem(key)) {
          console.log(form_id + ' : removing : ' + key + ' (empty checkbox), was: ' + localStorage.getItem(key));
          localStorage.removeItem(key);
        }
      }
    }
    else if (e.attr('type') == 'radio') {
      // TODO
    }
    else if (e.attr('editor') == 'ckeditor') {
      var input_value = CKEDITOR.instances[input_id].getData();

      if (input_value && input_value != '&nbsp;') {
        localStorage.setItem(key, input_value);
        return 1;
      }

      return 0;
    }
    else {
      var input_value = e.val();

      // Do not trim directly, since the var can be null
      if (typeof input_value === 'string') {
        input_value = input_value.trim();
      }

      if (! input_value) {
        return 0;
      }

      // console.log(form_id + ' : saving : ' + key + ' = ' + input_value + ' (type = ' + e.attr('type') + ')');
      localStorage.setItem(key, input_value);
      return 1;
    }

    return 0;
  };

  CRM.formautosaveRestore = function(form_id) {
    var keysuffix = '';

    if (CRM.formautosave.keysuffix) {
      keysuffix = ',' + CRM.formautosave.keysuffix;
    }

    $('.crm-container form#' + form_id + ' input').each(function() {
      var input_id = $(this).attr('id');
      var input_value = null;

      if (input_value = localStorage.getItem(form_id + keysuffix + '|' + input_id)) {
        if ($(this).attr('type') == 'checkbox') {
          // buggy, we sometimes store bogus data
          $(this).prop('checked', true);
        }
        else if ($(this).attr('type') == 'radio') {
          // todo
        }
        else {
          $(this).val(input_value);
        }
      }
    });

    $('.crm-container form#' + form_id + ' select').each(function() {
      var input_id = $(this).attr('id');
      var input_value = null;

      if (input_value = localStorage.getItem(form_id + keysuffix + '|' + input_id)) {
        $(this).val(input_value);
      }
    });

    $('.crm-container form#' + form_id + ' textarea').each(function() {
      var input_id = $(this).attr('id');
      var input_value = null;

      if (input_value = localStorage.getItem(form_id + keysuffix + '|' + input_id)) {
        if ($(this).attr('editor') == 'ckeditor') {
          CKEDITOR.instances[input_id].setData(input_value);
        }
        else {
          $(this).val(input_value);
        }
      }
    });
  };

  /**
   * Clear data stored for this form.
   */
  CRM.formautosaveClear = function(form_id, force) {
    var clearfunc = function() {
      var items_removed = 0;

      // In the key comparisons, also include the separator, i.e. '|' or ','
      var len = form_id.length + 1;

      for(var i in localStorage) {
        // Matches if the form_id is empty (clear all the local storage)
        // or the key is, for example: 'Activity|'
        // or the key is, for example: 'Activity,'
        if (form_id == '' || i.substr(0, len) == form_id + '|' || i.substr(0, len) == form_id + ',') {
          localStorage[i] = 'GARBAGE';
          localStorage.removeItem(i);
          items_removed++;
        }
      }

      CRM.formautosaveUpdateCount(form_id);
    };

    // We're forcing a full cache flush
    if (form_id == '' || force) {
      clearfunc();
      return;
    }

    // Otherwise, it was requested by the user, so show a confirmation dialog.
    var options = {};
    options[ts('Yes')] = clearfunc;

    CRM.confirm(options, {
      message: ts('Are you sure you want to clear the data saved locally for this form? This will delete data saved on disk, not the values in the form displayed on the screen.')
    });
  };

  /**
   * Updates the counter of saved elements.
   * If the form has a 'keysuffix', it will display the total items
   * specific to that suffix, as well as globally.
   */
  CRM.formautosaveUpdateCount = function(form_id) {
    var cpt_all = CRM.formautosaveCountItems(form_id);

    if (CRM.formautosave.keysuffix) {
      var cpt_this = CRM.formautosaveCountItems(form_id + ',' + CRM.formautosave.keysuffix);
      $('.crm-formautosave-counter-' + form_id).html(cpt_this + '/' + cpt_all);
    }
    else {
      $('.crm-formautosave-counter-' + form_id).html(cpt_all);
    }
  };

  /**
   * Returns a counter of stored elements for this form.
   * @see CRM.formautosaveUpdateCount().
   *
   * It's a bit lazy, and we should probably do a real count to avoid weird situations.
   * (or provide a real way to nuke all saved data for this site)
   *
   * NB: this function can be used in two ways: the form_id can be general, such as 'Activity',
   * in which case it will match any Activity info (which could be affected by a 'clear').
   * Otherwise, we can also count, for example, 'Activity,2,3', if we have data saved for a
   * a specific contact/case record. That's why we match on both '|' and ','.
   */
  CRM.formautosaveCountItems = function(form_id) {
    var cpt = 0;
    var len = form_id.length + 1;

    for(var i in localStorage) {
      if (i.substr(0, len) == form_id + '|' || i.substr(0, len) == form_id + ',') {
        cpt++;
      }
    }

    return cpt;
  };
})(CRM.$, CRM._, CRM.ts('formautosave'));
