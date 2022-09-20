# Google backends

There are four backends here, all using authentication via Google:

- Google Calendar
- Google Drive
- Google Firebase
- Google Sheets

## Google Calendar

### URLs

- `https://calendar.google.com/calendar/`
- `https://calendar.google.com/calendar/embed?src=your_email`
- `https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ`
- `https://calendar.google.com/calendar/embed?src=p9d9ld9vvhsk9q93hap417k1ds@group.calendar.google.com`
- `https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com`

## Google Drive

### URLs

- File URL like `https://drive.google.com/file/d/1aV-SUER-bXvph4PH28ppAu6lxoIlnA4F/view?usp=sharing`
- “My Drive“ folder URL like `https://drive.google.com/drive/u/0/my-drive`
- Folder URL like `https://drive.google.com/drive/u/0/folders/1VFdkWL6X0bV17x2xere8sUPoYMFByCz_` or `https://drive.google.com/drive/folders/1ALDwEixG2VJ-UKRJZH0CQH4bEkJ1PfoX`

### Constructor options

- `apiKey`
- `filename`: The name of the file to be created (if not the file URL, but URL of any folder, including the “My Drive” folder, is provided).
- `folder`: This option takes into account in two cases:
  - The user has no writing permissions and the new file with data might be created in the specified folder
  - While creating the backend, the user provided the URL of a folder, not a file, so the new file with data will be placed in the specified folder.
- `allowCreatingFiles`: Whether to create a file with data in the specified folder (if the `folder` parameter is provided) or in the user's “My Drive” folder on save, if they have no permission to modify the content of the source file.

## Google Firebase

### URLs

- Database URL like `https://mavo-demos.firebaseio.com`

### Constructor options

- `apiKey`
- `path`

## Google Sheets

### URLs

- Spreadsheet URL like `https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing`

### Constructor options

- `apiKey`
- `sheetTitle`: A sheet to read/write data from/to. If not provided, the first visible sheet will be used.
- `range`: A range with data in *A1 notation*.
- `allowAddingSheets`: Whether to add a new sheet on save if there is no sheet with the specified title.
- `serializeDates`: Whether dates, times, and durations should be represented as formatted strings (in their given number format which depends on the spreadsheet locale) instead of “serial number” format.

#### A1 notation for specifying cell ranges

This is a string like `A1:B2` that refers to a group of cells in the sheet (the first visible sheet) and is typically used in formulas. For example, valid ranges are:

- `A1:B2` refers to the first two cells in the top two rows of the sheet.
- `A:C` refers to all the cells in the first three columns of the sheet.
- `1:2` refers to all the cells in the first two rows of the sheet.
- `A5:A` refers to all the cells of the first column of the sheet, from row 5 onward.
- `C2:2` refers to all the cells of the second row of the sheet, from column C onward.

**Note:** Named ranges are also supported.
