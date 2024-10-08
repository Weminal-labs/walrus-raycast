import { Form, ActionPanel, Action, showToast, Toast, Icon, List } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { useState } from "react";
import path from "path";

import { AGGREGATOR } from "./constants";

interface DownloadFileProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function DownloadFile({ setLoading }: DownloadFileProps) {
  async function handleSubmit(values: {
    filename: string;
    blobId: string;
    folder: string[];
  }) {
    if (!values.filename) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a filename!",
      });
      return;
    }

    if (!values.blobId) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a Blob ID!",
      });
      return;
    }

    if (!values.folder[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a folder!",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading File..." });
    setLoading(true);

    try {
      const filePath = path.join(values.folder[0], values.filename);
      const blobId = values.blobId;
      const response = await axios.get(`${AGGREGATOR}/v1/${blobId}`, {
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data);

      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed Downloading File";
          toast.message = String(err);
          setLoading(false);
          console.log(err);
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "File Downloaded!";
          toast.message = `File saved to ${filePath}`;
          setLoading(false);
        }
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed Downloading File";
      toast.message = String(error);
      setLoading(false);
      console.log(error);
    }
  }
  return <Action.SubmitForm title="Download File" onSubmit={handleSubmit} icon={Icon.Download} />;
}

interface CommandProps {
  blobId: string;
  fileType: string;
}

export default function Command({ blobId = "", fileType }: CommandProps) {
  const [blobIdValue, setBlobIdValue] = useState<string>(blobId);
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <>
      <List>
        <List.EmptyView
          // icon={{ source: "" }}
          title="Downloading Your File"
          description="This could take a while depending on your file size and internet connection"
        />
      </List>
      {!loading && (
        <Form
          actions={
            <ActionPanel>
              <DownloadFile setLoading={setLoading} />
            </ActionPanel>
          }
        >
          <Form.Description text="Download a file from Walrus!" />
          <Form.TextField
            id="blobId" title="Blob ID" placeholder="Enter the Blob ID" value={blobIdValue} onChange={setBlobIdValue} />
          <Form.FilePicker title="Folder" canChooseFiles={false} canChooseDirectories={true} id="folder" allowMultipleSelection={false} />
          <Form.TextField id="filename" title="Filename" placeholder="Enter filename with extension" />
          <Form.Description
            title="File Type"
            text={fileType ? `${fileType.toLowerCase()}` : "No file type specified"}
          />
          <Form.Separator />
        </Form>
      )}
    </>
  );
}