# Google backends

There are two backends here, all using authentication via Google:

- Google Sheets
- Google Calendar

## Google Sheets

### URLs

- Spreadsheet URL like `https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing`

### Constructor options

- `apiKey`
- `sheetTitle`: A sheet to read/write data from/to. If not provided, the first visible sheet will be used.
- `range`: A range with data in *A1 notation*.
- `allowAddingSheets`: Whether to add a new sheet on save if there is no sheet with the specified title.
- `convertDateTime`: Whether serial numbers representing date/time in Google Sheets should be converted to ISO date/time.

#### A1 notation for specifying cell ranges

This is a string like `A1:B2` that refers to a group of cells in the sheet (the first visible sheet) and is typically used in formulas. For example, valid ranges are:

- `A1:B2` refers to the first two cells in the top two rows of the sheet.
- `A:C` refers to all the cells in the first three columns of the sheet.
- `1:2` refers to all the cells in the first two rows of the sheet.
- `A5:A` refers to all the cells of the first column of the sheet, from row 5 onward.
- `C2:2` refers to all the cells of the second row of the sheet, from column C onward.

**Note:** Named ranges are also supported.

## Google Calendar

### URLs

- `https://calendar.google.com/calendar/`
- `https://calendar.google.com/calendar/embed?src=your_email`
- `https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ`
- `https://calendar.google.com/calendar/embed?src=p9d9ld9vvhsk9q93hap417k1ds@group.calendar.google.com`
- `https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com`
