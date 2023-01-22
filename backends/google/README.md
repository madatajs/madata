# Google backends

There are four backends here, all using authentication via Google:

- Google Calendar
- Google Drive
- Google Firebase
- Google Sheets

## Google Calendar

| ✅ Auth | ❌ Writes | ❌ Uploads |
|---------|-----------|-----------|

Read events from public and private Google calendars.

### URL format

- The user's primary calendar URLs like `https://calendar.google.com/calendar/` or `https://calendar.google.com/calendar/embed?src=user_email`
- Public calendar URLs like `https://calendar.google.com/calendar/embed?src=p9d9ld9vvhsk9q93hap417k1ds@group.calendar.google.com` or `https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com`
- URLs from a browser address bar like `https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ`

## Google Drive

| ✅ Auth | ✅ Writes | ✅ Uploads |
|---------|-----------|-----------|

### URL format

- Regular file URLs like `https://drive.google.com/file/d/1aV-SUER-bXvph4PH28ppAu6lxoIlnA4F/view?usp=sharing`
- “My Drive“ folder URL like `https://drive.google.com/drive/u/0/my-drive`
- Any other folder URLs like `https://drive.google.com/drive/u/0/folders/1VFdkWL6X0bV17x2xere8sUPoYMFByCz_` or `https://drive.google.com/drive/folders/1ALDwEixG2VJ-UKRJZH0CQH4bEkJ1PfoX`

Note that you can't work with Google Docs using this backend. Use the Google Sheets backend instead.

### Constructor options

- `folder`: If the logged-in user has no permission to write data to the source file, Madata will try to create a copy of the file in the specified folder.
- `allowCreatingFiles`: Whether to create a file on save if logged-in user has no permission to write to the source file or the file doesn't exist. By default, Madata will try to create a file in the user's “My Drive” folder. Use the `folder` option to change the file location.
- `filename`: The name of the file to be created on save.

## Google Firebase

| ✅ Auth | ✅ Writes | ✅ Uploads |
|---------|-----------|-----------|

Write & read data and upload files using all the Google Firebase powers.

**URL format** Database URL like `https://project_id.firebaseio.com`

**Constructor option** `path`: Path to the file like `collection/document/collection/.../filename`

## Google Sheets

| ✅ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

Write & read data from public and private Google spreadsheets.

**URL format** Spreadsheet URL like `https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing`

### Constructor options

- `sheetTitle`: A sheet to read/write data from/to. If not provided, Madata will try to use the first visible sheet.
- `range`: A range with data in *A1 notation*. If not provided, Madata will try to use all data on the sheet.
- `allowAddingSheets`: Whether to add a new sheet on save if there is no sheet with the specified title.
- `serializeDates`: Whether dates, times, and durations should be represented as strings in their given number format (which depends on the spreadsheet locale). For example, instead of default `44963` might be returned `2/6/2023 12:15:00`. Defaults to `false`.

### A1 notation for specifying cell ranges

This is a string like `A1:B2` that refers to a group of cells in the sheet and is typically used in formulas. For example, valid ranges are:

- `A1:B2` refers to the first two cells in the top two rows of the sheet.
- `A:C` refers to all the cells in the first three columns of the sheet.
- `1:2` refers to all the cells in the first two rows of the sheet.
- `A5:A` refers to all the cells of the first column of the sheet, from row 5 onward.
- `C2:2` refers to all the cells of the second row of the sheet, from column C onward.

Note that *named ranges* are also supported.
