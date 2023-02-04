# Google Sheets

| ✅ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

Use [Google Sheets](https://www.google.com/sheets/about/) as a data source and storage. Collaborate with others on the same public or private spreadsheet simultaneously, using formulas and functions. And then use the obtained data in your app.

## Setting up

[Share a spreadsheet](https://www.lifewire.com/sharing-options-for-google-spreadsheets-3124090) and use the provided **URL** which has format like `https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing`.

To write data back to the spreadsheet (if allowed by specified permissions), you *must* be logged-in.

To read data from and write them back to a private spreadsheet, you *must* be logged-in. The plugin won't let you work with *other's private spreadsheets*, only yours.

## Constructor options

- `sheetTitle`: A sheet to read/write data from/to. If not provided, Madata will try to use the first visible sheet.
- `range`: A range with data in *A1 notation*. If not provided, Madata will try to use all data on the sheet.
- `allowAddingSheets`: Whether to add a new sheet on save if there is no sheet with the specified title. Defaults to `false`.
- `serializeDates`: Whether dates, times, and durations should be represented as strings in their given number format (which depends on the spreadsheet locale). For example, instead of default `44963` might be returned `2/6/2023 12:15:00`. Defaults to `false`.

## A1 notation for specifying cell ranges

This is a string like `A1:B2` that refers to a group of cells in the sheet and is typically used in formulas. For example, valid ranges are:

- `A1:B2` refers to the first two cells in the top two rows of the sheet.
- `A:C` refers to all the cells in the first three columns of the sheet.
- `1:2` refers to all the cells in the first two rows of the sheet.
- `A5:A` refers to all the cells of the first column of the sheet, from row 5 onward.
- `C2:2` refers to all the cells of the second row of the sheet, from column C onward.

Note that [named ranges](https://support.google.com/docs/answer/63175?hl=en) are also supported.

## Google Sheets version history

With the plugin, you can take advantage of the [Google Sheets version history system](https://www.ablebits.com/office-addins-blog/google-sheets-edit-history/). Before storing the data back, simply replace *unchanged* data with `null`, and the Google Sheets plugin will leave them *untouched* in the sheet.

If you want to remove data from the sheet (i.e., clear the corresponding cell), replace every piece of data which needs to be deleted with *an empty string* before you store the data.
