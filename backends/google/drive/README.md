# Google Drive

| ✅ Auth | ✅ Writes | ✅ Uploads |
|---------|-----------|-----------|

<div class="warning">

	If you decide to <a href="https://madata.dev/docs/authentication/">self-host your authentication server</a>, <a href="https://support.google.com/cloud/answer/6158849?hl=en">register an OAuth application</a> supporting the Google backends, and <a href="https://support.google.com/googleapi/answer/6310037?hl=en">restrict the API key</a> for (not only but including) the Google Drive API, you might face reading and/or storing data issues (for detail, see <a href="https://stackoverflow.com/questions/75346659/im-trying-to-restrict-an-api-key-to-google-drive-api-but-its-behaving-like-i">the question on Stackoverflow</a>). If this is an issue for your use case, you can either not restrict the API key for any APIs or use <a href="https://madata.dev/backends/">alternate backends</a> meanwhile.

</div>

## URL format

- Regular file URLs like `https://drive.google.com/file/d/1aV-SUER-bXvph4PH28ppAu6lxoIlnA4F/view?usp=sharing`
- “My Drive“ folder URL like `https://drive.google.com/drive/u/0/my-drive`
- Any other folder URLs like `https://drive.google.com/drive/u/0/folders/1VFdkWL6X0bV17x2xere8sUPoYMFByCz_` or `https://drive.google.com/drive/folders/1ALDwEixG2VJ-UKRJZH0CQH4bEkJ1PfoX`

Note that you can't work with Google Docs using this backend. Use the Google Sheets backend instead.

## Constructor options

- `folder`: If the logged-in user has no permission to write data to the source file, Madata will try to create a copy of the file in the specified folder.
- `allowCreatingFiles`: Whether to create a file on save if logged-in user has no permission to write to the source file or the file doesn't exist. By default, Madata will try to create a file in the user's “My Drive” folder. Use the `folder` option to change the file location.
- `filename`: The name of the file to be created on save.