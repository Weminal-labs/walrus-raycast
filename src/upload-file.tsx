import { ActionPanel, Form, Action, showToast, Toast, Detail } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { useState } from "react";
import { PUBLISHER } from "./constants";

interface UploadFileProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setUploadedData: React.Dispatch<React.SetStateAction<any | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

function UploadFile({ setLoading, setUploadedData, setError }: UploadFileProps) {
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(values: { file: string[] }) {
    if (!values.file[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a file!",
      });
      return;
    }

    setIsUploading(true);
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading File..." });

    try {
      const file = fs.createReadStream(values.file[0]);
      const res = await axios.put(`${PUBLISHER}/v1/store`, file, {
        headers: { 'Content-Type': 'application/octet-stream' }
      });

      setUploadedData(res.data);
      toast.style = Toast.Style.Success;
      toast.title = "File Uploaded Successfully!";
    } catch (error) {
      console.error("Error uploading file:", error);
      setError(JSON.stringify(error, null, 2));
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Upload File";
    } finally {
      setIsUploading(false);
      setLoading(false);
    }
  }

  return (
    <ActionPanel>
      <Action.SubmitForm title="Upload File" onSubmit={handleSubmit} />
    </ActionPanel>
  );
}

export default function Command() {
  const [loading, setLoading] = useState(false);
  const [uploadedData, setUploadedData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatUploadedData = (data: any): string => {
    let markdown = "";

    if (data.newlyCreated && data.newlyCreated.blobObject) {
      const { id, blobId, storedEpoch } = data.newlyCreated.blobObject;
      markdown += `
## Blob Object
- ID: ${id}
- Blob ID: ${blobId}
- Stored Epoch: ${storedEpoch}
      `;
    } else if (data.alreadyCertified && data.alreadyCertified.event) {
      const { blobId } = data.alreadyCertified;
      const { txDigest, eventSeq } = data.alreadyCertified.event;
      markdown += `
## Already Certified
- Blob ID: ${blobId}
- Transaction Digest: ${txDigest}
- Event Sequence: ${eventSeq}
      `;
    } else {
      markdown = "# No data available";
    }

    return markdown;
  };

  if (loading) {
    return <Detail markdown="![Loading](video_res.gif)" />;
  }

  if (uploadedData) {
    return <Detail markdown={formatUploadedData(uploadedData)} />;
  }

  if (error) {
    return <Detail markdown={`# Error\n\`\`\`json\n${error}\n\`\`\``} />;
  }

  return (
    <Form
      actions={
        <UploadFile
          setLoading={setLoading}
          setUploadedData={setUploadedData}
          setError={setError}
        />
      }
    >
      <Form.Description text="Upload a file to Walrus!" />
      <Form.FilePicker id="file" />
    </Form>
  );
}
