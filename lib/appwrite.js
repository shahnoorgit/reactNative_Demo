import { Alert } from "react-native";
import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

export const config = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.shan.aura",
  projectId: "66b21719000a71b35afe",
  databaseId: "66b218a90013621e8225",
  usercollectionId: "66b218d50022369c42a3",
  videocollectionId: "66b218fe00153ab6e10a",
  storageId: "66b21a9f00088ebfcf3a",
};
// Init your React Native SDK
const client = new Client();

client
  .setEndpoint(config.endpoint) // Your Appwrite Endpoint
  .setProject(config.projectId) // Your project ID
  .setPlatform(config.platform); // Your application ID or bundle ID.

//Creating instances
const account = new Account(client);
const avatars = new Avatars(client);
const database = new Databases(client);
const storage = new Storage(client);

// Register User
export const createUser = async (email, password, username) => {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    if (!newAccount) throw Error;

    const avatarUrl = avatars.getInitials(username);
    await signIn(email, password);
    const newUser = await database.createDocument(
      config.databaseId,
      config.usercollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email,
        username,
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

export const signIn = async (email, password) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();
    if (!currentAccount) throw Error;

    const currentUser = await database.listDocuments(
      config.databaseId,
      config.usercollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );
    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

export const getVideos = async () => {
  try {
    const res = await database.listDocuments(
      config.databaseId,
      config.videocollectionId,
      [Query.orderDesc("$createdAt")]
    );
    return res.documents;
  } catch (error) {
    console.log(error);
  }
};

export const getLatestVideos = async () => {
  try {
    const res = await database.listDocuments(
      config.databaseId,
      config.videocollectionId,
      [Query.orderDesc("$createdAt", Query.limit(7))]
    );
    return res.documents;
  } catch (error) {
    console.log(error);
  }
};

export async function SearchPost(query) {
  try {
    const posts = await database.listDocuments(
      config.databaseId,
      config.videocollectionId,
      [Query.search("title", query)]
    );

    if (!posts) throw new Error("Something went wrong");

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

export async function getUserPosts(userId) {
  try {
    if (!userId) {
      Alert.alert("UserId Not Provided");
      throw new Error("User ID is required");
    }
    const posts = await database.listDocuments(
      config.databaseId,
      config.videocollectionId,
      [Query.equal("creator", userId)]
    );

    if (!posts) throw new Error("Something went wrong");

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

export async function SignOut() {
  try {
    const session = await account.deleteSession("current");
    return session;
  } catch (error) {
    console.log(error);
    Alert.alert(error);
  }
}

export async function getFilePreview(uploadfileId, type) {
  let fileUrl;

  try {
    if (type === "video") {
      fileUrl = storage.getFileView(config.storageId, uploadfileId);
    } else if (type === "image") {
      fileUrl = storage.getFilePreview(
        config.storageId,
        uploadfileId,
        200,
        200,
        "top",
        100
      );
    } else {
      Alert.alert("Unsupported File Type");
      throw new Error("Unsupported File Type");
    }

    if (!fileUrl) throw Error("fileUrl not found");
    return fileUrl;
  } catch (error) {
    Alert.alert("Error while previewing");
    throw new Error(error);
  }
}

export async function uploadFile(file, type) {
  if (!file) return;
  const asset = {
    name: file.fileName,
    type: file.mimeType,
    size: file.fileSize,
    uri: file.uri,
  };

  try {
    const uploadedFile = await storage.createFile(
      config.storageId,
      ID.unique(),
      asset
    );
    const fileUrl = await getFilePreview(uploadedFile.$id, type);
    return fileUrl;
  } catch (error) {
    throw new Error(error);
  }
}

export async function UploadVideo(form) {
  try {
    const [thumbnailUrl, videoUrl] = await Promise.all([
      uploadFile(form.thumbnail, "image"),
      uploadFile(form.video, "video"),
    ]);
    const newPost = await database.createDocument(
      config.databaseId,
      config.videocollectionId,
      ID.unique(),
      {
        title: form.title,
        thumbnail: thumbnailUrl,
        video: videoUrl,
        prompt: form.prompt,
        creator: form.userId,
      }
    );

    return newPost;
  } catch (error) {
    throw new Error(error);
  }
}
