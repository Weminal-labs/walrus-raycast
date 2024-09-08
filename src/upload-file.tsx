import { ActionPanel, Form, Action, showToast, Toast, Detail } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { useState, useEffect } from "react";
import { PUBLISHER } from "./constants";

interface UploadFileProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setUploadedData: React.Dispatch<React.SetStateAction<UploadedData | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

interface AlreadyCertified {
  blobId: string;
  event: {
    txDigest: string;
    eventSeq: string;
  };
  endEpoch: number;
}

interface NewlyCreated {
  blobObject: {
    id: string;
    storedEpoch: number;
    blobId: string;
    size: number;
    erasureCodeType: string;
    certifiedEpoch: number;
    storage: object; // You might want to define a more specific type for this
  };
  encodedSize: number;
  cost: number;
}

interface UploadedData {
  alreadyCertified?: AlreadyCertified;
  newlyCreated?: NewlyCreated;
}

function UploadFile({ setLoading, setUploadedData, setError }: UploadFileProps) {
  async function handleSubmit(values: { file: string[] }) {
    if (!values.file[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a file!",
      });
      return;
    }

    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading File..." });

    try {
      const file = fs.createReadStream(values.file[0]);
      const res = await axios.put(`${PUBLISHER}/v1/store`, file, {
        headers: { "Content-Type": "application/octet-stream" },
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
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formattedMarkdown, setFormattedMarkdown] = useState<string>("");

  useEffect(() => {
    if (uploadedData) {
      (async () => {
        const markdown = await formatUploadedData(uploadedData);
        setFormattedMarkdown(markdown);
      })();
    }
  }, [uploadedData]);

  const formatUploadedData = async (data: UploadedData) => {
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
      let blobObjectId = "";
      try {
        const response = await axios.post(
          "https://fullnode.testnet.sui.io:443",
          {
            jsonrpc: "2.0",
            id: 1,
            method: "sui_getTransactionBlock",
            params: [
              txDigest,
              {
                showInput: true,
                showRawInput: false,
                showEffects: true,
                showEvents: true,
                showObjectChanges: false,
                showBalanceChanges: false,
                showRawEffects: false,
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        blobObjectId = response.data.result.effects.modifiedAtVersions[2].objectId; // becareful with the index of the blob object may change
      } catch (error) {
        console.error("Error loading objects:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading objects",
          message: "Please try again later",
        });
      }
      markdown += `
## Already Certified
- Blob ID: ${blobId}
- Transaction Digest: ${txDigest}
- Event Sequence: ${eventSeq}
- Blob Object ID: ${blobObjectId}
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
    return <Detail markdown={formattedMarkdown} />;
  }

  if (error) {
    return <Detail markdown={`# Error\n\`\`\`json\n${error}\n\`\`\``} />;
  }

  return (
    <Form actions={<UploadFile setLoading={setLoading} setUploadedData={setUploadedData} setError={setError} />}>
      <Form.Description text="Upload a file to Walrus!" />
      <Form.FilePicker id="file" />
    </Form>
  );
}
