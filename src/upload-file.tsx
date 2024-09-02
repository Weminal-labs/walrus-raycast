import { Form, ActionPanel, Action, showToast, Toast, Clipboard, Icon, List } from "@raycast/api";
import axios from "axios";
import fs from "fs";
import { useState } from "react";
import { PUBLISHER } from "./constants";

interface UploadFileProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

function UploadFile({ setLoading }: UploadFileProps) {
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

      const res = await axios.put(`${PUBLISHER}/v1/store`, file, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      })
      console.log(res.data.alreadyCertified);
      const resObject = res.data;
      const txDigest = resObject.alreadyCertified.event.txDigest;
      await Clipboard.copy(txDigest);

      toast.style = Toast.Style.Success;
      toast.title = "File Uploaded!";
      toast.message = String("Transaction Digest copied to clipboard");
      setLoading(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed Uploading File";
      toast.message = String(error);
      setLoading(false);
      console.log(error);
    }
  }
  return <Action.SubmitForm title="Upload File" onSubmit={handleSubmit} icon={Icon.Upload} />;
}

export default function Command() {
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <>
      <List>
        <List.EmptyView
          // icon={{ source: "" }}
          title="Uploading Your File"
          description="This could take a while depending on your file size and internet connection"
        />
      </List>
      {!loading && (
        <Form
          actions={
            <ActionPanel>
              <UploadFile setLoading={setLoading} />
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
