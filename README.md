# CiviCRM Form Auto-Save

Automatically saves to disk (localStorage) CiviCRM forms to avoid losing data
when unexpected errors occur. To restore the form data, re-open the same form,
click on the 'restore' link in the upper-right corner of the screen.

It is aimed at CiviCRM installations where staff do a lot of data entry, and
sooner or later, a large form with lots of data gets lost in an obscur error.

It also makes it possible to save the values of a form in a json file that can
be downloaded (saved in a real file), then later re-uploaded from another
environment (another browser, computer, etc). This can be useful for when having
to reproduce bugs. NB: when restoring data, you can either import in the exact
same form (where custom field IDs will be the same), or in a new instance of the
form (ex: new activity). You cannot restore date from one edit form to the edit
form of another entity (where custom field row IDs will not match).

This uses HTML5 DOM storage, so support may vary depending on the browser.
The extension is developed and tested mainly on Firefox and Chrome.

Written and maintained by (C) 2013-2020 Mathieu Lutfy  
https://www.symbiotic.coop  
https://www.bidon.ca

To get the latest version of this module:  
https://github.com/mlutfy/formautosave

Distributed under the terms of the GNU Affero General public license (AGPL).  
See LICENSE.txt for details.

Includes the FileSaver.js library Copyright © 2015 Eli Grey:  
https://github.com/eligrey/FileSaver.js

## Supported use-cases

- Tested with Firefox 22+ and Chrome 27

- On browsers without "localStorage" support (presumably very old browsers),
  the extension should simply not enable. You will not see the "restore/clear"
  links in the upper-right corner of the form.

- Tested on the forms for: "New Contact", "New Case", "Send e-mail to contact".
  Not very much tested when there are multiple forms in the same screen, but it
  should work (forms are saved/restored separately, as long as they are forms
  with a different ID, e.g. form#Contact, form#Activity, form#Case, etc.)

- This extension saves fields on a per-form basis, so there is a risk that if
  a user, for example, created an activity for a first contact, then a second,
  but the second contact had less information than the first one (not all fields
  were filled in), then restoring on the second contact activity might restore
  data from the first activity, since we never implicitely delete stored data.
  To work around this problem, on a case by case basis, we create a 'keysuffix'
  key using some IDs from the context, such as the contact_id, case_id, etc.
  This is mostly done for Case Activities. If you have a use case, please open
  an issue.

- Tested with CKEditor, but not other WYSIWYG editors.

- Note that currently the extension enables itself for all forms.
  You can either hide the restore/delete links in your CSS of your public theme,
  or send ideas on how to handle the distinction in a better way. :)

WARNING: the extension checks explicitely to avoid saving credit card information
on disk, as this would be a security risk and goes against PCI-DSS. However, this
has not been tested extensively. After enabling this extension, check that it is
not saving sensitive information by looking at the Javascript console of your
browser (Ctrl+Shift+K in Firefox, Shift+F12 then click "console" in Chrome).

## Todo

* Support autocomplete (select2) fields.

## Recommended extensions

You may also be interested in the 'report error' extension:  
https://lab.civicrm.org/extensions/reporterror

It sends the administrator an e-mail everytime someone encounters a fatal CiviCRM
error, including information on the page, referer, etc. This way you are informed
of an error before the user calls you, and it helps to document and discover patterns.

## Support

Please post bug reports in the issue tracker of this project on github:  
https://github.com/mlutfy/formautosave/issues

Commercial support provided by Coop Symbiotic:  
https://www.symbiotic.coop/en

