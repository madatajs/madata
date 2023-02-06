# Google Firebase

| ✅ Auth | ✅ Writes | ✅ Uploads |
|---------|-----------|-----------|

Write & read data and upload files using all the Google Firebase powers.

**URL format** Database URL like `https://project_id.firebaseio.com`

## Setting up

### Step 1: [Sign into Firebase](https://console.firebase.google.com/) using your Google account

### Step 2: Create a Firebase project

1.  In the [Firebase console](https://console.firebase.google.com/), click **Add project**, then enter a **Project name**.

2.  (_Optional_) If you are creating a new project, you can edit the **Project ID**.

    Firebase automatically assigns a unique ID to your Firebase project. To use a specific identifier, you must edit your project ID during this setup step. You cannot change your project ID later.

3.  Click **Continue**.

4.  (_Optional_) Set up Google Analytics for your project, then click **Continue**.

5.  Click **Create project**.

    Firebase automatically provisions resources for your Firebase project. When the process completes, you'll be taken to the overview page for your Firebase project in the Firebase console.

6. Click **Continue**.

### Step 3: Register your app with Firebase

1. In the center of the [Firebase console](https://console.firebase.google.com/)'s project overview page, click the **Web** icon (**</>**) to launch the setup workflow.

If you've already added an app to your Firebase project, click **Add app** to display the platform options.

2. Enter your app's nickname.

   This nickname is an internal, convenience identifier and is only visible to you in the Firebase console.

3. (_Optional_) Set up Firebase Hosting for your web app.

4. Click **Register app**.

5. Save for later usage the two values: **projectId** and **apiKey**.

6. Click **Continue to console**.

### Step 4: Activate Cloud Firestore

1. In the [Firebase console](https://console.firebase.google.com/), open the **Firestore Database** section in the **Build** section of Product categories.

2. Click **Create database**.

3. Review the messaging about securing your data using security rules. Choose the mode you want to start in.

4. Click **Next**.

5. Select a location for your Cloud Firestore data.

<div class="note">

  If you aren't able to select a location, then your project already has a default resource location. It was set either during project creation or when setting up another service that requires a location setting.

</div>

<div class="warning">

  After you set your project's default resource location, you cannot change it.

</div>

6. Click **Done**.

### Step 5: Set up Cloud Firestore security rules

1. In the [Firebase console](https://console.firebase.google.com/), open the **Firestore Database** section.

2. Open the **Rules** tab.

3. [Write your rules](#cloud-firestore) in the online editor, then click **Publish**.

### Step 6: Enable Google Sign-In in the Firebase console

1. In the [Firebase console](https://console.firebase.google.com/), open the **Authentication** section in the **Build** section of Product categories.

2. On the **Sign-in method** tab, in the **Sign-in providers** section, enable the **Google** sign-in method.

3. Click **Save**.

### Step 7: Whitelist your domain

To use Firebase Authentication in a web app, you must whitelist the domains that the Firebase Authentication servers can redirect to after signing in a user.

By default, **localhost** and your Firebase project's hosting domain are whitelisted. You must whitelist the full domain names of any other of your Mavo app's hosts. **Note**: whitelisting a domain allows for requests from any URL and port of that domain.

1. In the [Firebase console](https://console.firebase.google.com/), open the **Authentication** section.
2. On the **Settings** tab, in the **Authorized domains** section (in the **Domains** group), click **Add domain**.

3. Type in the name of your domain and click **Add**.

### Step 8: Create a default Storage bucket

Cloud Storage for Firebase lets you upload and share user generated content, such as images and video, which allows you to build rich media content into your apps.

1. From the navigation pane of the [Firebase console](https://console.firebase.google.com/), select **Storage** in the **Build** section of Product categories, then click **Get started**.

2. Review the messaging about securing your Storage data using security rules. During development, consider setting up your rules for public access.

3. Click **Next**.

4. Select a location for your default Storage bucket.

<div class="note">

  If you aren't able to select a location, then your project already has a default resource location. It was set either during project creation or when setting up another service that requires a location setting.

</div>

<div class="warning">

  After you set your project's default resource location, you cannot change it.

</div>

5. Click **Done**.

### Step 9: Set up security rules for the default Storage bucket

1. In the [Firebase console](https://console.firebase.google.com/), open the **Storage** section.

2. Open the **Rules** tab.

3. [Write your rules](#storage-bucket) in the online editor, then click **Publish**.

## Constructor options

- `apiKey`: API key from the Firebase config file/object of your project's app. You can find it on the Firebase console's Project settings page.
- `path`: Path to the file like `collection/document/collection/.../document`.

## Security rules examples

### General rules

#### Cloud Firestore

1. Allow read/write access on all documents to any authenticated user:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth.uid != null;
    }
  }
}
```

2. Allow public read/write access on all documents:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Allow public read access, but only authenticated users can write:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true
      allow write: if request.auth.uid != null;
    }
  }
}
```

#### Storage bucket

1. Only authenticated users can read or write to the bucket:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

2. Anyone, even people not using the app, can read or write to the bucket:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write;
    }
  }
}
```

3. Anyone, even people not using the app, can read from the bucket, only authenticated users write to the bucket:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read;
      allow write: if request.auth != null;
    }
  }
}
```

### App-specific rules

Assume your data is stored in the `data.json` document inside the `madata` collection. All extra files (e.g., images) are stored inside the `madata-files` “folder”.

The corresponding security rules might look like:

#### Cloud Firestore

1. Allow read/write access to your app's data to any authenticated user:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /madata/data.json {
      allow read, write: if request.auth.uid != null;
    }
  }
}
```

2. Allow public read/write access to your app's data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /madata/data.json {
      allow read, write: if true;
    }
  }
}
```

3. Allow public read access, but only authenticated users can write:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /madata/data.json {
      allow read: if true
      allow write: if request.auth.uid != null;
    }
  }
}
```

#### Storage bucket

1. Only authenticated users can read or write to the bucket:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /madata-files {
        match /{allPaths=**} {
            allow read, write: if request.auth != null;
        }
    }
  }
}
```

2. Anyone, even people not using the app, can read or write to the bucket:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /madata-files {
        match /{allPaths=**} {
            allow read, write;
        }
    }
  }
}
```

3. Anyone, even people not using the app, can read from the bucket; only authenticated users write to the bucket:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /madata-files {
        match /{allPaths=**} {
            allow read;
            allow write: if request.auth != null;
        }
    }
  }
}
```
