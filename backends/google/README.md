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

### Setting up

[Share a calendar](https://www.pcworld.com/article/394972/how-to-share-your-google-calendar-with-others.html) and use the provided **URL** when creating an instance of the backend.

### URL format

- The user's primary calendar URLs like `https://calendar.google.com/calendar/` or `https://calendar.google.com/calendar/embed?src=user_email`
- Public calendar URLs like `https://calendar.google.com/calendar/embed?src=p9d9ld9vvhsk9q93hap417k1ds@group.calendar.google.com` or `https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com`
- URLs from a browser address bar like `https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ`

### Constructor options

You can customize the way the plugin reads data from a calendar by passing a separate `options` parameter to the backend constructor. Its value is either a *query string* (without leading `?`) or an *object* specifying all needed options. The list of *all* supported options (query parameters) you can find in [the documentation](https://developers.google.com/calendar/api/v3/reference/events/list#parameters).

### Events

The plugin will return *an array of events* from the specified calendar (by default *250* events but not more than *2500* events).

Every event has *numerous* properties, the most useful of which are the following:

| Property | Description |
| -------- | ----------- |
| `summary` | Title of the event. |
| `description` | Description of the event. |
| `location` | (Geographic) location of the event (as text). |
| `start` | The (inclusive) start time of the event. For a *recurring event*, this is the start time of the first instance. Properties: `date` (if this is an all-day event), `dateTime`, `timeZone`. |
| `end` | The (exclusive) end time of the event. For a *recurring event*, this is the end time of the first instance. Properties: `date` (if this is an all-day event), `dateTime`, `timeZone`. |
| `attendees` | The attendees of the event. Every element of the collection has the following properties: `email`, `displayName`, `responseStatus`, etc. |
| `creator` | The creator of the event with the following properties: `email`, `displayName`, etc. |
| `organizer` | The organizer of the event with the following properties: `email`, `displayName`, etc. If the organizer is also an attendee, this is indicated with a separate element in the `attendees` collection with the `organizer` property set to *true*. |
| `hangoutLink` | An absolute link to the Google Hangout associated with this event. |
| `attachments` | File attachments for the event. Every element of the collection has the following properties: `title`, `mimeType`, `fileUrl`, etc. |

The list of *all* supported properties (with description) you can find in [the documentation](https://developers.google.com/calendar/api/v3/reference/events#resource-representations).

### Example

Assume the calendar being read is the public calendar of official holidays in France with URL `https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com`.

```js
import Backend from "https://madata.dev/src/index.js";

let backend = Backend.create("https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com",
  { options: { singleEvents: true, orderBy: "startTime", maxResults: 15 } });
let json = await backend.load();

console.log(json);
```

In the console you'll see the first 15 events ordered by the start time. All recurring events will be expanded into instances (recurring events themselves won't be returned). **Note that you can use `orderBy: "startTime"` only with the `singleEvents: true` option together.**

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

### Constructor options

- `apiKey`: API key from the Firebase config file/object of your project's app. You can find it on the Firebase console's Project settings page.
- `path`: Path to the file like `collection/document/collection/.../filename`.

## Google Sheets

| ✅ Auth | ✅ Writes | ❌ Uploads |
|---------|-----------|-----------|

Use [Google Sheets](https://www.google.com/sheets/about/) as a data source and storage. Collaborate with others on the same public or private spreadsheet simultaneously, using formulas and functions. And then use the obtained data in your app.

### Setting up

[Share a spreadsheet](https://www.lifewire.com/sharing-options-for-google-spreadsheets-3124090) and use the provided **URL** which has format like `https://docs.google.com/spreadsheets/d/14bzCuziKutrA3iESarKoj2o56dhraR8pzuFAuwTIo-g/edit?usp=sharing`.

To write data back to the spreadsheet (if allowed by specified permissions), you *must* be logged-in.

To read data from and write them back to a private spreadsheet, you *must* be logged-in. The plugin won't let you work with *other's private spreadsheets*, only yours.

### Constructor options

- `sheetTitle`: A sheet to read/write data from/to. If not provided, Madata will try to use the first visible sheet.
- `range`: A range with data in *A1 notation*. If not provided, Madata will try to use all data on the sheet.
- `allowAddingSheets`: Whether to add a new sheet on save if there is no sheet with the specified title. Defaults to `false`.
- `serializeDates`: Whether dates, times, and durations should be represented as strings in their given number format (which depends on the spreadsheet locale). For example, instead of default `44963` might be returned `2/6/2023 12:15:00`. Defaults to `false`.

### A1 notation for specifying cell ranges

This is a string like `A1:B2` that refers to a group of cells in the sheet and is typically used in formulas. For example, valid ranges are:

- `A1:B2` refers to the first two cells in the top two rows of the sheet.
- `A:C` refers to all the cells in the first three columns of the sheet.
- `1:2` refers to all the cells in the first two rows of the sheet.
- `A5:A` refers to all the cells of the first column of the sheet, from row 5 onward.
- `C2:2` refers to all the cells of the second row of the sheet, from column C onward.

Note that [named ranges](https://support.google.com/docs/answer/63175?hl=en) are also supported.

### Google Sheets version history

With the plugin, you can take advantage of the [Google Sheets version history system](https://www.ablebits.com/office-addins-blog/google-sheets-edit-history/). Before storing the data back, simply replace *unchanged* data with `null`, and the Google Sheets plugin will leave them *untouched* in the sheet.

If you want to remove data from the sheet (i.e., clear the corresponding cell), replace every piece of data which needs to be deleted with *an empty string* before you store the data.
