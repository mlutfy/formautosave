
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

(function($, _, ts) {
  if (typeof localStorage != 'object') {
    console.log('Warning: localStorage not supported by browser. CiviCRM form auto-save will not work. Please upgrade to the latest version of your browser.');
    return;
  }

  $(function() {
    $('.crm-container form').each(function() {
      var form_id = $(this).attr('id');
      if (form_id) {
        CRM.formautosaveInit(form_id);
      }
    });

    // Bind the click event on the 'download' link.
    // Done outside the loop in case there are multiple forms in the page.
    // [ML] FIXME ^^  untrue with proper selectors.
    $('.crm-formautosave-download a').click(function(event) {
      var id = $(this).attr('href').substr(1);
      CRM.formautosaveSave(id, true);
      event.preventDefault();
      return false;
    });

    $('.crm-formautosave-upload a').click(function(event) {
      var $this = $(this);
      var id = $this.attr('href').substr(1);
      CRM.formautosaveUpload(id, $this);
      event.preventDefault();
      return false;
    });

    // Bind the click event on the 'restore' link.
    $('.crm-formautosave-restore a').click(function(event) {
      // Extract the form_id from, for example, '#Activity'
      // I avoided putting just 'Activity' as the href, since it could be really
      // confusing if javascript is buggy, or middle-click.
      var form_id = $(this).attr('href').substr(1);
      CRM.formautosaveRestore(form_id);
      event.preventDefault();
      return false;
    });

    // Bind the click event to the 'clear' link.
    $('.crm-formautosave-clear a').click(function(event) {
      // Extract the form_id from, for example, '#Activity'
      // I avoided putting just 'Activity' as the href, since it could be really
      // confusing if javascript is buggy, or middle-click.
      var id = $(this).attr('href').substr(1);
      CRM.formautosaveClear(id, false);

      event.preventDefault();
      return false;
    });

    // This is a bit silly, but we will wait 5 seconds before enabling.
    // On some forms, a lot of things happen at load time, so it can cause
    // false 'on change' events to be captured, and browser overload.
    setTimeout(function(){
      $('.crm-container form').not('#id_search_block').each(function() {
        var form_id = $(this).attr('id');
        if (form_id) {
          CRM.formautosaveEnable(form_id);
        }
      });
    }, 5000);
  });

  CRM.formautosaveInit = function(form_id) {
    var keysuffix = '';
    if (CRM.formautosave.keysuffix) {
      keysuffix = '-' + CRM.formautosave.keysuffix;
    }

    var $this = $('#' + form_id);

    // Avoid adding the restore/clear links multiple times when popups open.
    if ($this.hasClass('crm-formautosave-form-processed')) {
      return;
    }

    $this.addClass('crm-formautosave-form-processed');

    // A few forms where autosave makes no sense
    var avoid_forms = [ 'id_search_block', 'ActivityView', 'CaseView', 'Search' ];

    if (avoid_forms.includes(form_id)) {
      return;
    }

    // NB: the click events on these links are binded outside the loop, to avoid binding multiple times
    $this.prepend('<div class="crm-formautosave-download"><a href="#' + form_id +'" download="' + form_id + keysuffix + '.json" title="Download">' + '<span class="ui-icon ui-icon-disk"></span>' + '</a></div>');
    $this.prepend('<div class="crm-formautosave-upload"><a href="#' + form_id +'" title="Upload">' + '<span class="ui-icon ui-icon-folder-open"></span>' + '</a></div>');
    $this.prepend('<div class="crm-formautosave-restore"><a href="#' + form_id +'">' + ts('Restore') + '</a></div>');

    // Link to clear/delete the saved form data
    var class_name = 'crm-formautosave-counter-' + form_id;
    $this.prepend('<div class="crm-formautosave-clear"><a href="#' + form_id + '">' + ts('Clear') + '<span class="crm-formautosave-counter-wrapper"> (<span class="' + class_name + '"></span>)</span></a></div>');
    CRM.formautosaveUpdateCount(form_id);
  }

  /**
   * When a first element is changed, start the autosave (save data every
   * 10 seconds), and flush the old form data.
   *
   * TODO: Would be better to just save when an input is changed.
   * I guess I wanted to avoid having JS events on all input types,
   * but if a user leaves their form open for a while, it's a bit of
   * a waste?
   */
  CRM.formautosaveEnable = function(form_id) {
    $('#' + form_id + ' input').one('change', function() {
      if ($('#' + form_id).hasClass('crm-formautosave-enabled')) {
        return;
      }

      $('#' + form_id).addClass('crm-formautosave-enabled');

      var key = form_id;
      if (CRM.formautosave.keysuffix) {
        key += ',' + CRM.formautosave.keysuffix;
      }

      console.log('[formautosave] Flushing: ' + key);
      CRM.formautosaveClear(key, true);

      // Save the form values every 10 seconds
      setInterval(function(){
        try {
          CRM.formautosaveSave(form_id, false);
        }
        catch (error) {
          CRM.alert(ts('Your disk local storage was full. This is used for auto-saving CiviCRM forms. It has been automatically cleared. The exact error was:') + ' ' + error, '', 'ok');
          CRM.formautosaveClear('', true);
          CRM.formautosaveSave(form_id, false);
        }
      }, 10000);
    });
  };

  /**
   * Save (and optionally download to disk) the form values.
   *
   * Save each form with a separate key (Activity, Case, etc) + IDs that
   * can be set by our buildForm hook. Makes it easier to restore one form
   * but not another.
   */
  CRM.formautosaveSave = function(form_id, download) {
    var data = {};
    var sel = '#' + form_id;
    var keysuffix = form_id + (CRM.formautosave.keysuffix ? ',' + CRM.formautosave.keysuffix : '');

    $(sel + ' input[type="text"], '
      + sel + ' input[type="checkbox"], '
      + sel + ' input[type="radio"], '
      + sel + ' select, '
      + sel + ' textarea').each(function() {

      var $this = $(this);
      var input_id = $this.attr('id');

      if (! input_id) {
        return;
      }

      // Build the localStorage key
      var key = keysuffix + '|' + input_id;

      // Never save credit card data on disk
      if (input_id == 'credit_card_number' || input_id == 'cvv2' || input_id == 'credit_card_exp_date[M]' || input_id == 'credit_card_exp_date[Y]') {
        return;
      }

      if ($this.attr('type') == 'checkbox') {
        if ($this.prop('checked')) {
          // console.log(form_id + ' : saving checkbox : ' + key + ' = checked');
          localStorage.setItem(key, 'checked');
          data[key] = 'checked';
        }
        else {
          if (localStorage.getItem(key)) {
            // console.log(form_id + ' : removing : ' + key + ' (empty checkbox), was: ' + localStorage.getItem(key));
            localStorage.removeItem(key);
          }
        }
      }
      else if ($this.attr('type') == 'radio') {
        // Key needs to be generated using the name, otherwise quickform uses IDs such as QF_FOO
        key = form_id + (CRM.formautosave.keysuffix ? ',' + CRM.formautosave.keysuffix : '') + '|' + $this.attr('name');

        if ($this.prop('checked')) {
          localStorage.setItem(key, $this.val());
          data[key] = $this.val();
        }
        else {
          // Check if this radio button (group) has any value select
          // and if not, check whether we have to delete from the localStorage.
          var name = $this.attr('name');

          // CiviCRM sometimes has fields with brackets, ex: email[1][is_bulkmail]
          name = name.replace(/\[/g, '\\[').replace(/\]/g, '\\]');

          if ($('input[name=' + name + ']:checked').size() <= 0) {
            if (localStorage.getItem(key) != null) {
              // console.log(form_id + ' : removing radio button ' + key);
              localStorage.removeItem(key);
            }
          }
        }
      }
      else {
        var input_value = $this.val();

        // Do not trim directly, since the var can be null
        if (typeof input_value === 'string') {
          input_value = input_value.trim();
        }

        if (! input_value) {
          return;
        }

        // This is only to help with debugging (ex: textarea/ckeditor fields)
        var input_type = $this.attr('type');

        if (typeof input_type == 'undefined') {
          input_type = $this.prop('nodeName');
        }

        // console.log(form_id + ' : saving : ' + key + ' = ' + input_value + '; type = ' + input_type);
        localStorage.setItem(key, input_value);
        data[key] = input_value;
      }
    });

    // EXPERIMENTAL: Save the data in CiviCRM, if the feature was enabled.
    // See the function comments for more info.
    CRM.formautosaveRemoteSave(form_id, data);

    // Update the saved items counter
    CRM.formautosaveUpdateCount(form_id);

    if (download) {
      // c.f. dist/filesaver/FileSaver.min.js
      var blob = new Blob([JSON.stringify(data)], {type: "text/plain;charset=utf-8"});
      saveAs(blob, "formautosave-" + keysuffix + ".json");
    }
  };

  /**
   * EXPERIMENTAL: Save the data in CiviCRM, if the feature was enabled.
   * See the formautosave_remotesave_forms setting.
   */
  CRM.formautosaveRemoteSave = function(form_id, data) {
    if (typeof CRM.formautosave.remotesave == 'undefined' || !CRM.formautosave.remotesave) {
      return;
    }

    console.log('[formautosave] removesave enabled');

    // FIXME: for now we only support "On Behalf" forms.
    // FIXME: hardcoded email-3
    if (CRM.formautosave.remotesave_cid) {
      // FIXME: For now, we only do a first basic save (create), we do not update.
      return;
    }

    // Check if we have organization_name and email
    if (!(data[form_id + '|onbehalf_organization_name'] && data[form_id + '|onbehalf_email-3'])) {
      return;
    }

    CRM.api4('Formautosave', 'create', {
      values: {
        "contact_type": "Organization",
        "organization_name": data[form_id + '|onbehalf_organization_name'],
        "email": data[form_id + '|onbehalf_email-3']
      }
    }).then(function(results) {
      // do something with results array
      console.log('[formautosave] saved OK', results);
      CRM.formautosave.remotesave_cid = 99999; // FIXME
    }, function(failure) {
      // handle failure
      console.log('[formautosave] failed to save', failure);
    });
  };

  /**
   * Restore a form using a json file uploaded by the user.
   * This function handles the popup/ui to upload, as well as processing.
   * It stores the values in the localStorage then calls the Restore function.
   */
  CRM.formautosaveUpload = function(form_id, $this) {
    var $parent = $this.parent();
    $parent.toggleClass('crm-formautosave-upload-open');

    if (! $parent.hasClass('crm-formautosave-upload-open')) {
      $parent.find('div').remove();
      return;
    }

    var keysuffix = '';
    if (CRM.formautosave.keysuffix) {
      keysuffix = ',' + CRM.formautosave.keysuffix;
    }

    $parent.append(
      '<div><form id="formautosave-upload-form" action="index.php" method="post" enctype="multipart/form-data">'
      + '<a class="formautosave-upload-close" title="' + ts('Cancel', {escape:'js'}) + '"><span class="ui-icon ui-icon-close"></span></a>'
      + '<p>' + ts('Form restoration file upload:') + '</p><input id="formautosave-upload-file" type="file" class="required" name="upload_file" />'
      + '<input type="button" value="' + ts('Upload', {escape:'js'}) + '" /></form></div>');

    $('.formautosave-upload-close', $parent).on('click', function(e) {
      $parent.removeClass('crm-formautosave-upload-open');
      $parent.find('div').remove();
    });

    $('input[type="button"]', $parent).on('click', function(e) {
      var file = document.getElementById('formautosave-upload-file').files[0];

      // Ignore binary files.
      if (! file.type.match(/(plain|json)/) || ! file.name.match('json')) {
        CRM.alert(ts("Unsupported file format: %1 for %2", {1:file.type, 2:file.name}), '', 'error');
        return;
      }

      var reader = new FileReader();
 
      reader.addEventListener("load", function(event) {
        var textFile = event.target;
        var data = JSON.parse(textFile.result);

        // Close the popup
        $parent.find('div').remove();
        $parent.toggleClass('crm-formautosave-upload-open');

        // Silently clear saved data in localStorage for this form
        // otherwise we would concatenate data.
        CRM.formautosaveClear(form_id, true);

        $.each(data, function(key, val) {
          var parts = key.split('|');

          if ($('#' + parts[1]).size() <= 0 && $('input[type="' + parts[1] + '"]').size() <= 0) {
            // if custom field, we deal with two use-cases:
            // 1- we are restoring in the same form as originally, so all IDs match
            // 2- we are restoring in a new instance of the form, so custom field IDs are -1.
            // we do not handle cases where we are restoring in another edit form.
            if (parts[1].match(/^custom_\d+_\d+$/) && $(parts[1]).size() == 0) {
              parts[1] = parts[1].replace(/_(\d+)$/, '_-1');
            }
            else if (parts[1].match(/^custom_\d+_\d+_\d+$/) && $(parts[1]).size() == 0) {
              // ex: checkboxes have the form custom_123_456_78 => custom_123_-1_78
              parts[1] = parts[1].replace(/_(\d+)_(\d+)$/, '_-1_$2');
            }
          }

          key = form_id + keysuffix + '|' + parts[1];
          localStorage.setItem(key, val);
        });

        CRM.formautosaveRestore(form_id);
      });

      reader.readAsText(file);
    });
  };

  CRM.formautosaveRestore = function(form_id) {
    var delay_change = [];
    var keysuffix = '';

    if (CRM.formautosave.keysuffix) {
      keysuffix = ',' + CRM.formautosave.keysuffix;
    }

    // Text fields and checkboxes
    $('form#' + form_id + ' input[type="text"], form#' + form_id + ' input[type="checkbox"]').each(function() {
      var input_id = $(this).attr('id');
      var input_value = localStorage.getItem(form_id + keysuffix + '|' + input_id);

      if (!input_id) {
        return;
      }

      // NB: inputs can have a value 0 (which is a valid value to restore)
      if (input_value !== '') {
        if ($(this).attr('type') == 'checkbox') {
          if (input_value == 'checked' || input_value == 1) {
            $(this).prop('checked', true);
          }
        }
        else {
          $(this).val(input_value);

          if ($(this).hasClass('crm-hidden-date')) {
            delay_change.push(input_id);
          }
        }
      }
    });

    // Radio buttons (use the 'name' attribute)
    $('form#' + form_id + ' input[type="radio"]').each(function() {
      var input_id = $(this).attr('name');
      var input_value = localStorage.getItem(form_id + keysuffix + '|' + input_id);

      if ($(this).attr('value') === input_value) {
        $(this).prop('checked', true);
      }
    });

    // Select
    // nb: we want to avoid triggering a change, since some fields such as case_type_id
    // can cause a partial form reload (ex: new case form).
    $('form#' + form_id + ' select').each(function() {
      var input_id = $(this).attr('id');
      var input_value = null;

      if (input_value = localStorage.getItem(form_id + keysuffix + '|' + input_id)) {
        try {
          $(this).select2('val', input_value);
        }
        catch(err) {
          $(this).val(input_value);
        }
      }
    });

    // Textareas
    $('.crm-container form#' + form_id + ' textarea').each(function() {
      var input_id = $(this).attr('id');
      var input_value = null;

      if (input_value = localStorage.getItem(form_id + keysuffix + '|' + input_id)) {
        if ($(this).hasClass('crm-wysiwyg-enabled')) {
          CKEDITOR.instances[input_id].setData(input_value);
        }
        else {
          $(this).val(input_value);
        }
      }
    });

    // Trigger change events on dates
    // Wait until the end, otherwise it triggers the flushing of data (c.f. formautosaveEnable)
    if (delay_change.length > 0) {
      delay_change.forEach(function(i) {
        $('#' + i).trigger('change');
      });
    }

    CRM.alert(ts("Form restoration complete."), '', 'success');
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
    CRM.confirm({
      message: ts('Are you sure you want to clear the data saved locally for this form? This will delete data saved on disk, not the values in the form displayed on the screen.')
    })
    .on('crmConfirm:yes', clearfunc);
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
})(CRM.$, CRM._, CRM.ts('ca.bidon.formautosave'));
