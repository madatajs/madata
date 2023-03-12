# Google Sheets

| ✅ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

Use [Google Sheets](https://www.google.com/sheets/about/) as a data source and storage. Collaborate with others on the same public or private spreadsheet simultaneously, using formulas and functions. And then use the obtained data in your app.

## Setting up

[Share a spreadsheet](https://www.lifewire.com/sharing-options-for-google-spreadsheets-3124090) and use the provided **URL** which has format like `https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing`.

Or simply open your spreadsheet in a browser and use the **URL** from the address bar. In this case, the URL has format like `https://docs.google.com/spreadsheets/d/1IMFDv0aWWZ8F4GIdk_gmOwl60DD4-eCnLEX1CV9WBho/edit#gid=0`.

To write data back to the spreadsheet (if allowed by specified permissions), you *must* be logged-in.

To read data from and write them back to a *private spreadsheet*, you *must* be logged-in. Madata won't let you work with *other's private spreadsheets*, only yours.

## Constructor options

- `sheet`: A sheet to read/write data from/to. If not provided, Madata will try to use the sheet specified in the URL or the first visible one.
- `range`: A range with data in *A1 notation*. If not provided, Madata will try to use all data on the sheet.
- `headerRow`: Whether the first row of data is a row with column headings. If so, Madata will return an array of objects where each object corresponds to one row of data. Column headings will become objects keys and the cells values will become keys values. In this case, the header row won't be a part of the returned data. Defaults to `false`.
- `transpose`: Whether to transpose data before returning it. This option might be useful, e.g., when your data has headings *not in the first row*, but *in the first column*. Simply transpose the data, so that the first column becomes the first row, the second column becomes the second row, and so on. Defaults to `false`.
- `keys`: Accepts an array of strings or a function. If provided, Madata will return an array of objects. Objects keys are either taken from the specified array or are returned by the provided mapping function. The function should return an object key and take header text, column index, and array of headers as arguments. This option might be useful when your data has no headings (and you'd like to provide ones that might be used as object keys), or your data headings can't be used as object keys (they are too lengthy, or contain not allowed characters, etc.), or you simply want to tweak them. If you want Madata to automatically generate object keys for you (zero-based indices), simply provide `[]` (an empty array) as the value of this option. If you provide not enough keys in the array or the mapping function returns `undefined` or `null` in some cases, Madata will use a corresponding (zero-based) index as the default object key. If your data headings have duplicates, you may find the `GoogleSheets.keys()` static method useful—it'll return unique object keys based on your data headings.
- `allowAddingSheets`: Whether to add a new sheet on save if there is no sheet with the specified title. Defaults to `false`.
- `serializeDates`: Whether dates, times, and durations should be represented as strings in their given number format (which depends on the spreadsheet locale). For example, instead of default `44963` might be returned `2/6/2023 12:15:00`. Defaults to `false`.
- `smartValues`: Whether the strings will be parsed (as formulas, booleans, or numbers) as if the user typed them into a cell via the Google Sheets UI. For example, the `Mar 1, 2016` string becomes a date, and `=1+2` becomes a formula. Formats can also be inferred, so `$100.15` becomes a number with currency formatting. Defaults to `false`.

## A1 notation for specifying cell ranges

This is a string like `A1:B2` that refers to a group of cells in the sheet and is typically used in formulas. For example, valid ranges are:

- `A1:B2` refers to the first two cells in the top two rows of the sheet.
- `A:C` refers to all the cells in the first three columns of the sheet.
- `1:2` refers to all the cells in the first two rows of the sheet.
- `A5:A` refers to all the cells of the first column of the sheet, from row 5 onward.
- `C2:2` refers to all the cells of the second row of the sheet, from column C onward.

[Named ranges](https://support.google.com/docs/answer/63175?hl=en) are also supported.

## Google Sheets version history

With the backend, you can take advantage of the [Google Sheets version history system](https://www.ablebits.com/office-addins-blog/google-sheets-edit-history/). Before storing the data back, simply replace *unchanged* data with `null`, and the Google Sheets backend will leave them *untouched* in the sheet.

If you want to remove data from the sheet (i.e., clear the corresponding cell), replace every piece of data which needs to be deleted with *an empty string* before you store the data.
