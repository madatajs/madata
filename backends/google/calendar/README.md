# Google Calendar

| ✅ Auth | ❌ Writes | ❌ Uploads |
|---------|-----------|-----------|

Read events from public and private Google calendars.

## Setting up

[Share a calendar](https://www.pcworld.com/article/394972/how-to-share-your-google-calendar-with-others.html) and use the provided **URL** when creating an instance of the backend.

## URL format

- The user's primary calendar URLs like `https://calendar.google.com/calendar/` or `https://calendar.google.com/calendar/embed?src=user_email`
- Public calendar URLs like `https://calendar.google.com/calendar/embed?src=p9d9ld9vvhsk9q93hap417k1ds@group.calendar.google.com` or `https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com`
- URLs from a browser address bar like `https://calendar.google.com/calendar/u/0?cid=cDlkOWxkOXZ2aHNrOXE5M2hhcDQxN2sxZHNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ`

## Constructor options

You can customize the way the plugin reads data from a calendar by passing the needed options to the backend constructor. The list of *all* supported options you can find in [the documentation](https://developers.google.com/calendar/api/v3/reference/events/list#parameters).

## Events

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

## Example

Assume the calendar being read is the public calendar of official holidays in France with URL `https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com`.

```js
import Backend from "https://madata.dev/src/index.js";

let backend = Backend.from("https://calendar.google.com/calendar/embed?src=fr.french%23holiday%40group.v.calendar.google.com",
  { singleEvents: true, orderBy: "startTime", maxResults: 15 });
let json = await backend.load();

console.log(json);
```

In the console you'll see the first 15 events ordered by the start time. All recurring events will be expanded into instances (recurring events themselves won't be returned).

<div class="note">

  You can use `orderBy: "startTime"` only with the `singleEvents: true` option together.

</div>
