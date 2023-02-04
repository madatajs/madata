# Google Drive

| ✅ Auth | ✅ Writes | ✅ Uploads |
|---------|-----------|-----------|

## URL format

- Regular file URLs like `https://drive.google.com/file/d/1aV-SUER-bXvph4PH28ppAu6lxoIlnA4F/view?usp=sharing`
- “My Drive“ folder URL like `https://drive.google.com/drive/u/0/my-drive`
- Any other folder URLs like `https://drive.google.com/drive/u/0/folders/1VFdkWL6X0bV17x2xere8sUPoYMFByCz_` or `https://drive.google.com/drive/folders/1ALDwEixG2VJ-UKRJZH0CQH4bEkJ1PfoX`

Note that you can't work with Google Docs using this backend. Use the Google Sheets backend instead.

## Constructor options

- `folder`: If the logged-in user has no permission to write data to the source file, Madata will try to create a copy of the file in the specified folder.
- `allowCreatingFiles`: Whether to create a file on save if logged-in user has no permission to write to the source file or the file doesn't exist. By default, Madata will try to create a file in the user's “My Drive” folder. Use the `folder` option to change the file location.
- `filename`: The name of the file to be created on save.