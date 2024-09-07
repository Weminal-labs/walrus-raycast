import { List, ActionPanel, Action, showToast, Toast, Form } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import { DownloadFile } from "./download-file";

interface BlobObject {
  data: {
    objectId: string;
    version: string;
    digest: string;
    content: {
      dataType: string;
      type: string;
      hasPublicTransfer: boolean;
      fields: {
        blob_id: string;
        certified_epoch: string;
        erasure_code_type: number;
        id: {
          id: string;
        };
        size: string;
        storage: {
          type: string;
          fields: {
            end_epoch: string;
            id: object; // specific type later
            start_epoch: string;
            storage_size: string;
          }
        }
        stored_epoch: string;
      }
    }
  }
}
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [blobObjects, setBlobObjects] = useState<BlobObject[]>([]);
  const [selectedBlobObject, setSelectedBlobObject] = useState<BlobObject | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function getBlobObjects() {
      try {
        const response = await axios.post('https://fullnode.testnet.sui.io:443', {
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getOwnedObjects",
          params: [
            "0xefc1c1949e8137cd00975832cb291bb230b2dcfec84424e5024bb8e449469dab",
            {
              filter: {
                MatchAll: [
                  {
                    StructType: "0x7e12d67a52106ddd5f26c6ff4fe740ba5dea7cfc138d5b1d33863ba9098aa6fe::blob::Blob"
                  }
                ]
              },
              options: {
                showType: false,
                showOwner: false,
                showPreviousTransaction: false,
                showDisplay: false,
                showContent: true,
                showBcs: false,
                showStorageRebate: false
              }
            }
          ]
        }, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        const blobObjects = response.data.result.data;
        setBlobObjects(blobObjects);
        console.log("Object loaded:", blobObjects[0].data);
      } catch (error) {
        console.error("Error loading objects:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading objects",
          message: "Please try again later",
        });
      }
    }
    getBlobObjects();
  }, [])

  const filteredBlobObjects = blobObjects.filter((blobObject: BlobObject) =>
    blobObject.data.content.fields.blob_id.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isShowingDetail
      navigationTitle="Image Browser"
      searchBarPlaceholder="Search images..."
      onSearchTextChange={setSearchText}
      onSelectionChange={(blob_id) => {
        const selected = filteredBlobObjects.find(blob => blob.data.content.fields.blob_id === blob_id);
        setSelectedBlobObject(selected || null);
      }}
    >
      {filteredBlobObjects.map((blobObject: BlobObject) => (
        <List.Item
          id={blobObject.data.content.fields.blob_id}
          key={blobObject.data.content.fields.blob_id}
          title={blobObject.data.content.fields.blob_id}
          icon={""}
          detail={
            <List.Item.Detail
              markdown={`![${blobObject.data.content.fields.blob_id}]()`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Sui Object ID" text={blobObject.data.content.fields.id.id} />
                  <List.Item.Detail.Metadata.Label title="Blob ID" text={blobObject.data.content.fields.blob_id} />
                  <List.Item.Detail.Metadata.Label title="Certified epoch" text={blobObject.data.content.fields.certified_epoch} />
                  <List.Item.Detail.Metadata.Label title="Size" text={blobObject.data.content.fields.size} />
                  <List.Item.Detail.Metadata.Label title="Stored Epoch" text={blobObject.data.content.fields.stored_epoch} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Download"
                target={<>
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
                      id="blobId" title="Blob ID" placeholder="Enter the Blob ID" defaultValue={selectedBlobObject?.data.content.fields.blob_id} />
                    <Form.FilePicker title="Folder" canChooseFiles={false} canChooseDirectories={true} id="folder" allowMultipleSelection={false} />
                    <Form.TextField id="filename" title="Filename" placeholder="Enter name for file" />
                    <Form.Separator />
                  </Form>
                  )}
                </>}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No images found" />
    </List>
  );
}
