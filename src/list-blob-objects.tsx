import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

import DownloadFileCommand from "./download-file"
import { u256ToBlobId } from "./utils";

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

  async function getObjectDetails(objectId: string) {
    try {
      console.log("Fetching object details for:", objectId);
      const response = await axios.post('https://fullnode.testnet.sui.io:443', {
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getObject",
        params: [
          objectId,
          {
            showType: false,
            showOwner: false,
            showPreviousTransaction: false,
            showDisplay: false,
            showContent: true,
            showBcs: false,
            showStorageRebate: false
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.data.result;
    } catch (error) {
      console.error("Error fetching object details:", error);
      throw error;
    }
  }

  useEffect(() => {
    async function getBlobObjects() {
      try {
        const response = await axios.post('https://fullnode.testnet.sui.io:443', {
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getOwnedObjects",
          params: [
            "0xf1346af6127e9b1717f31a91df9ab26331731dcc7940a881aa2a3fd9e6df099d",
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
  }, [searchText])

  const filteredBlobObjects = blobObjects.filter((blobObject: BlobObject) =>
    blobObject.data.content.fields.id.id.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isShowingDetail
      navigationTitle="Image Browser"
      searchBarPlaceholder="Search images..."
      onSearchTextChange={setSearchText}
      onSelectionChange={async (blobObjectId) => {
        const selected = await getObjectDetails(blobObjectId as string);
        setSelectedBlobObject(selected);
      }}
    >
      {filteredBlobObjects.map((blobObject: BlobObject) => (
        <List.Item
          id={blobObject.data.content.fields.id.id}
          key={blobObject.data.content.fields.id.id}
          title={blobObject.data.content.fields.id.id}
          icon={""}
          detail={
            <List.Item.Detail
              markdown={`![${u256ToBlobId(BigInt(blobObject.data.content.fields.blob_id))}]()`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Sui Object ID" text={blobObject.data.content.fields.id.id} />
                  <List.Item.Detail.Metadata.Label title="Blob ID" text={u256ToBlobId(BigInt(blobObject.data.content.fields.blob_id))} />
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
                target={<DownloadFileCommand blobId={u256ToBlobId(BigInt(selectedBlobObject?.data?.content?.fields?.blob_id || '0'))} />}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView title="No images found" />
    </List>
  );
}
