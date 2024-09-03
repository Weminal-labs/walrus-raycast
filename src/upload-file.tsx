import { Form, ActionPanel, Action, showToast, Toast, Clipboard, Icon, List, Detail } from "@raycast/api";
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
  async function handleSubmit(values: { file: string[]; }) {
    if (!values.file[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a file!",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading File..." });
    setLoading(true);

    try {
      const file = fs.createReadStream(values.file[0]);

      console.log("Sending request to upload file...");
      const res = await axios.put(`${PUBLISHER}/v1/store`, file, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      console.log("Full API response:");
      console.log(JSON.stringify(res.data, null, 2));

      setUploadedData(res.data);

      let toastMsg = "";
      
      const resObject = res.data;
      if (resObject.newlyCreated) {
        toastMsg = "Blob object id copied to clipboard";
        const blobObjectId = resObject.newlyCreated.blobObject.id;
        await Clipboard.copy(blobObjectId);
        console.log("Newly created blob object ID:", blobObjectId);
      } else {
        const txDigest = resObject.alreadyCertified.event.txDigest;
        toastMsg = "Transaction Digest copied to clipboard";
        await Clipboard.copy(txDigest);
        console.log("Already certified transaction digest:", txDigest);
      }

      toast.style = Toast.Style.Success;
      toast.title = "File Uploaded!";
      toast.message = String(toastMsg);
      setLoading(false);
    } catch (error) {
      console.error("Error uploading file:");
      console.error(error);

      toast.style = Toast.Style.Failure;
      toast.title = "Failed Uploading File";
      toast.message = String(error);
      setError(JSON.stringify(error, null, 2));
      setLoading(false);
    }
  }
  return <Action.SubmitForm title="Upload File" onSubmit={handleSubmit} icon={Icon.Upload} />;
}

function UploadedDataDetail({ data }: { data: any }) {
  if (!data) {
    return <Detail markdown="# No data available" />;
  }

  let markdown = "# Uploaded File Details\n\n";

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
    return <Detail markdown="# No data available" />;
  }

  return <Detail markdown={markdown} />;
}

function ErrorDetail({ error }: { error: string }) {
  const markdown = `
  # Error Details

  \`\`\`json
  ${error}
  \`\`\`
    `;

  return <Detail markdown={markdown} />;
}

export default function Command() {
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadedData, setUploadedData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return <ErrorDetail error={error} />;
  }

  if (uploadedData) {
    return <UploadedDataDetail data={uploadedData} />;
  }

  return (
    <>
      <List>
        <List.EmptyView
          title="Uploading Your File"
          description="This could take a while depending on your file size and internet connection"
        />
      </List>
      {!loading && (
        <Form
          actions={
            <ActionPanel>
              <UploadFile setLoading={setLoading} setUploadedData={setUploadedData} setError={setError} />
            </ActionPanel>
          }
        >
          <Form.Description text="Upload a file to Walrus!" />
          <Form.FilePicker id="file" allowMultipleSelection={false} />
          <Form.Separator />
        </Form>
      )}
    </>
  );
}
