
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

cj(function($) {
  if (typeof localStorage != 'object') {
    console.log('Warning: localStorage not supported by browser. CiviCRM form auto-save will not work. Please upgrade to the latest version of your browser.');
    return;
  }

  $('.crm-container form').not('#id_search_block').each(function() {
    var form_id = $(this).attr('id');

    console.log(form_id + ': CiviCRM form auto-save enabled.');

    // usually should translate Case, Activity, but will not always work (ex: CustomData) since not in .po files
    var params = new Array();
    params[1] = ts(form_id);

    // NB: the click event is binded outside the loop, to avoid binding multiple times
    $(this).prepend('<div class="crm-formautosave-restore"><a href="#' + form_id +'">' + ts('Restore %1', params) + '</a></div>');

    // Link to clear/delete the saved form data
    var saved_items = civicrm_formautosave_countitems(form_id);
    var class_name = 'crm-formautosave-counter-' + form_id;
    $(this).prepend('<div class="crm-formautosave-clear"><a href="#' + form_id + '">' + ts('Clear') + ' (<span class="' + class_name + '">' + saved_items + '</span>)</a></div>');

    // Append the keysuffix at this point, now that we have displayed it to the user
    if (CRM.formautosave.keysuffix) {
      form_id += ',' + CRM.formautosave.keysuffix;
    }

    // Save the form values every 10 seconds
    setInterval(function(){
      try{
        civicrm_formautosave_save(form_id);
      }
      catch (error) {
        CRM.alert(ts('Your disk local storage was full. This is used for auto-saving CiviCRM forms. It has been automatically cleared. The exact error was:') + ' ' + error, '', 'ok');
        civicrm_formautosave_clear('');
        civicrm_formautosave_save(form_id);
      }
    }, 10000);
  });

  // Bind the click event on the 'restore' link.
  // Done outside the loop in case there are multiple forms in the page.
  $('.crm-formautosave-restore a').click(function(event) {
    // Extract the form_id from, for example, '#Activity'
    // I avoided putting just 'Activity' as the href, since it could be really
    // confusing if javascript is buggy, or middle-click.
    var id = cj(this).attr('href').substr(1);
    civicrm_formautosave_restore(id);

    event.preventDefault();
    return false;
  });

  // Bind the click event to the 'clear' link.
  $('.crm-formautosave-clear a').click(function(event) {
    // Extract the form_id from, for example, '#Activity'
    // I avoided putting just 'Activity' as the href, since it could be really
    // confusing if javascript is buggy, or middle-click.
    var id = cj(this).attr('href').substr(1);
    civicrm_formautosave_clear(id);

    event.preventDefault();
    return false;
  });

  function civicrm_formautosave_save(form_id) {
    // Save each form with a separate key
    // Makes it easier to restore one form but not another.
    // $('.crm-container form#' + form_id).each(function() {
      //  var form_id = $(this).attr('id');
      var items_saved = 0;

      // console.log(form_id + ': Auto-saving form');

      $('.crm-container form input').each(function() {
        // Avoid saving submit buttons, and make sure the 'id' is defined
        if (! $(this).hasClass('form-submit') && $(this).attr('id')) {
          items_saved += civicrm_formautosave_save_element(form_id, $(this));
        }
      });

      $('.crm-container form select').each(function() {
        items_saved += civicrm_formautosave_save_element(form_id, $(this));
      });

      $('.crm-container form textarea').each(function() {
        if ($(this).attr('editor') == 'ckeditor') {
          // console.log(form_id + ': found a ckeditor: ' + $(this).attr('id'));
          var input_id = $(this).attr('id');

          var input_value = CKEDITOR.instances[input_id].getData();
          var key = form_id + '|' + input_id;

          if (input_value && input_value != '&nbsp;') {
            // console.log(form_id + ' : saving : ' + key + ' = ' + input_value + ' (type = textarea wysiwyg)');
            localStorage.setItem(key, input_value);
            items_saved++;
          }
        }
        else {
          items_saved += civicrm_formautosave_save_element(form_id, $(this));
        }
      });

      console.log(form_id + ': ' + items_saved + ' items saved.');
      var cpt = civicrm_formautosave_countitems(form_id);
      $('.crm-formautosave-counter-' + form_id).html(cpt);
    // });
  }

  function civicrm_formautosave_save_element(form_id, e) {
    var input_id = e.attr('id');
    var input_value = e.val();
    var key = form_id + '|' + input_id;

    // Has to be done separately, because some special input fields can have a null value
    if (input_value) {
      input_value = input_value.trim();
    }

    if (! input_value) {
      return 0;
    }

    // Never save credit card data on disk
    if (input_id == 'credit_card_number' || input_id == 'cvv2' || input_id == 'credit_card_exp_date[M]' || input_id == 'credit_card_exp_date[Y]') {
      return 0;
    }

    if (e.attr('type') == 'checkbox') {
/* buggy
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
*/
    }
    else if (e.attr('type') == 'radio') {
      // TODO
    }
    else if (input_value) {
      // console.log(form_id + ' : saving : ' + key + ' = ' + input_value + ' (type = ' + e.attr('type') + ')');
      localStorage.setItem(key, input_value);
      return 1;
    }

    return 0;
  }

  function civicrm_formautosave_restore(form_id) {
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
          // $(this).prop('checked', true);
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
  }

  /**
   * Clear data stored for this form.
   */
  function civicrm_formautosave_clear(form_id) {
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
console.log('REMOVED: ' + i);
          localStorage.removeItem(i);
          items_removed++;
        }
      }

      $('.crm-formautosave-counter-' + form_id).html('0');

      console.log(form_id + ': ' + items_removed + ' items cleared.');
      // CRM.alert(ts('Storage cleared.'), '', 'success');
    };

    // We're forcing a full cache flush
    if (form_id == '') {
      clearfunc();
      return;
    }

    // Otherwise, it was requested by the user, so show a confirmation dialog.
    var options = {};
    options[ts('Yes')] = clearfunc;

    CRM.confirm(options, {
      message: ts('Are you sure you want to clear the data saved locally for this form? This will delete data saved on disk, not the values in the form displayed on the screen.')
    });
  }

  /**
   * Returns a counter of stored elements for this form.
   * It's a bit lazy, and we should probably do a real count to avoid weird situations.
   * (or provide a real way to nuke all saved data for this site)
   */
  function civicrm_formautosave_countitems(form_id) {
    var cpt = 0;
    var len = form_id.length;
    var key = form_id + '|';

    for(var i in localStorage) {
      if (i.substr(0, len + 1) == key) {
        cpt++;
      }
    }

    return cpt;
  }
});
