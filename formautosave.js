
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

    $(this).prepend('<div style="float: right; border: 1px solid #000;"><a href="#" onclick="civicrm_formautosave_restore(\'' + form_id + '\')">' + ts('Restore: %1', params) + '</a></div>');

    // Link to clear/delete the saved form data
    var saved_items = civicrm_formautosave_countitems(form_id);
    var class_name = 'crm-autosave-counter-' + form_id;
    $(this).prepend('<div style="float: right;"><a href="#" onclick="civicrm_formautosave_clear(\'' + form_id + '\')">' + ts('Clear') + ' (<span class="' + class_name + '">' + saved_items + '</span>)</a></div>');

    // Save the form values every 5 seconds
    setInterval(function(){
      civicrm_formautosave_save(form_id);
    }, 10000);
  });

  function civicrm_formautosave_save(form_id) {
    // Save each form with a separate key
    // Makes it easier to restore one form but not another.
    $('.crm-container form#' + form_id).each(function() {
      var form_id = $(this).attr('id');
      var items_saved = 0;

      console.log(form_id + ': Auto-saving form');

      $('.crm-container form input').each(function() {
        // Avoid saving submit buttons, and make sure the 'id' is defined
        if (! $(this).hasClass('form-submit') && $(this).attr('id')) {
          items_saved += civicrm_formautosave_save_element(form_id, $(this));
        }
      });

      $('.crm-container form select').each(function() {
        items_saved += civicrm_formautosave_save_element(form_id, $(this));
      });

      console.log(form_id + ': ' + items_saved + ' items saved.');
      var cpt = civicrm_formautosave_countitems(form_id);
      cj('.crm-autosave-counter-' + form_id).html(cpt);
    });
  }

  function civicrm_formautosave_save_element(form_id, e) {
    var input_id = e.attr('id');
    var input_value = e.val().trim();
    var key = form_id + '|' + input_id;

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
      console.log(form_id + ' : saving : ' + key + ' = ' + input_value + ' (type = ' + e.attr('type') + ')');
      localStorage.setItem(key, input_value);
      return 1;
    }

    return 0;
  }
});

// FIXME: in the global scope otherwise function won't be found.
// what's the best way to do this?
function civicrm_formautosave_restore(form_id) {
  cj('.crm-container form#' + form_id + ' input').each(function() {
    var input_id = cj(this).attr('id');
    var input_value = null;

    if (input_value = localStorage.getItem(form_id + '|' + input_id)) {
      if (cj(this).attr('type') == 'checkbox') {
        // buggy, we sometimes store bogus data
        // cj(this).prop('checked', true);
      }
      else if (cj(this).attr('type') == 'radio') {
        // todo
      }
      else {
        cj(this).val(input_value);
      }
    }
  });

  cj('.crm-container form#' + form_id + ' select').each(function() {
    var input_id = cj(this).attr('id');
    var input_value = null;

    if (input_value = localStorage.getItem(form_id + '|' + input_id)) {
      cj(this).val(input_value);
    }
  });
}

/**
 * Clear data stored for this form.
 */
function civicrm_formautosave_clear(form_id) {
  var options = {};
  options[ts('Yes')] = function() {
    var items_removed = 0;
    var len = form_id.length;
    var key = form_id + '|';

    for(var i in localStorage) {
      if (i.substr(0, len + 1) == key) {
        localStorage[i] = 'GARBAGE';
        localStorage.removeItem(i);
        items_removed++;
      }
    }

    cj('.crm-autosave-counter-' + form_id).html('0');

    console.log(form_id + ': ' + items_removed + ' items cleared.');
    // CRM.alert(ts('Storage cleared.'), '', 'success');
  };

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

