CiviCRM Form Auto-Save
======================

Automatically saves to disk CiviCRM forms to avoid losing data when unexpected
errors occur.

This uses HTML5 DOM storage, so support may vary depending on the browser.
The extension is developed and tested mainly on the latest version of Firefox.

Written and maintained by (C) 2013 Mathieu Lutfy
http://www.nodisys.ca/en

To get the latest version of this module:
https://github.com/mlutfy/ca.bidon.formautosave

Distributed under the terms of the GNU Affero General public license (AGPL).
See LICENSE.txt for details.

Supported use-cases
===================

- Tested with Firefox 22+ and Chrome 27

- On browsers without "localStorage" support (presumably very old browsers),
  the extension should simply not enable. You will not see the "restore/clear"
  links in the upper-right corner of the form.

- Tested on the forms for: "New Contact", "New Case", "Send e-mail to contact".
  Not very much tested when there are multiple forms in the same screen, but it
  should work (forms are saved/restored separately, as long as they are forms
  with a different ID, e.g. form#Contact, form#Activity, form#Case, etc.)

- Tested with CKEditor, but not other WYSIWYG editors.

- Note that currently the extension enables itself for all forms.
  You can either hide the restore/delete links in your CSS of your public theme,
  or send ideas on how to handle the distinction in a better way. :)

WARNING: the extension checks explicitely to avoid saving credit card information
on disk, as this would be a security risk and goes against PCI-DSS. However, this
has not been tested extensively. After enabling this extension, check that it is
not saving sensitive information by looking at the Javascript console of your
browser (Ctrl+Shift+K in Firefox, Shift+F12 then click "console" in Chrome).

Support
=======

Please post bug reports in the issue tracker of this project on github:
https://github.com/mlutfy/ca.bidon.formautosave/issues

This is a community contributed extension written thanks to the financial
support of organisations using it, as well as the very helpful and collaborative
CiviCRM community.

If you appreciate this module, please consider donating 10$ to the CiviCRM project:
http://civicrm.org/participate/support-civicrm

While I do my best to provide volunteer support for this extension, please
consider financially contributing to support or development of this extension
if you can.
http://www.nodisys.ca/en

