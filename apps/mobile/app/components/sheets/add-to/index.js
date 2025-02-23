/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import React, {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { Keyboard, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { db } from "../../../common/database";
import {
  eSubscribeEvent,
  eUnSubscribeEvent,
  ToastEvent
} from "../../../services/event-manager";
import Navigation from "../../../services/navigation";
import SearchService from "../../../services/search";
import { useNotebookStore } from "../../../stores/use-notebook-store";
import { useSelectionStore } from "../../../stores/use-selection-store";
import { useThemeStore } from "../../../stores/use-theme-store";
import { eOpenMoveNoteDialog } from "../../../utils/events";
import { Dialog } from "../../dialog";
import DialogHeader from "../../dialog/dialog-header";
import { presentDialog } from "../../dialog/functions";
import { Button } from "../../ui/button";
import SheetWrapper from "../../ui/sheet";
import Paragraph from "../../ui/typography/paragraph";
import { SelectionProvider } from "./context";
import { FilteredList } from "./filtered-list";
import { ListItem } from "./list-item";

const actionSheetRef = createRef();
const AddToNotebookSheet = () => {
  const [visible, setVisible] = useState(false);
  const [note, setNote] = useState(null);

  function open(note) {
    setNote(note);
    setVisible(true);
    actionSheetRef.current?.setModalVisible(true);
  }

  useEffect(() => {
    eSubscribeEvent(eOpenMoveNoteDialog, open);
    return () => {
      eUnSubscribeEvent(eOpenMoveNoteDialog, open);
    };
  }, []);

  const _onClose = () => {
    setVisible(false);
    setNote(null);
    Navigation.queueRoutesForUpdate(
      "Notes",
      "Favorites",
      "ColoredNotes",
      "TaggedNotes",
      "TopicNotes",
      "Notebooks",
      "Notebook"
    );
  };

  return !visible ? null : (
    <SheetWrapper fwdRef={actionSheetRef} onClose={_onClose}>
      <MoveNoteComponent note={note} />
    </SheetWrapper>
  );
};

export default AddToNotebookSheet;

const MoveNoteComponent = ({ note }) => {
  const colors = useThemeStore((state) => state.colors);
  const [multiSelect, setMultiSelect] = useState(false);
  const notebooks = useNotebookStore((state) =>
    state.notebooks.filter((n) => n?.type === "notebook")
  );
  const [edited, setEdited] = useState(false);
  const selectedItemsList = useSelectionStore(
    (state) => state.selectedItemsList
  );
  const setNotebooks = useNotebookStore((state) => state.setNotebooks);
  const [itemState, setItemState] = useState({});

  const onAddNotebook = async (title) => {
    if (!title || title.trim().length === 0) {
      ToastEvent.show({
        heading: "Notebook title is required",
        type: "error",
        context: "local"
      });
      return false;
    }

    await db.notebooks.add({
      title: title,
      description: null,
      topics: [],
      id: null
    });
    setNotebooks();
    return true;
  };

  const openAddTopicDialog = (item) => {
    presentDialog({
      context: "move_note",
      input: true,
      inputPlaceholder: "Enter title",
      title: "New topic",
      paragraph: "Add a new topic in " + item.title,
      positiveText: "Add",
      positivePress: (value) => {
        return onAddTopic(value, item);
      }
    });
  };

  const onAddTopic = useCallback(
    async (value, item) => {
      if (!value || value.trim().length === 0) {
        ToastEvent.show({
          heading: "Topic title is required",
          type: "error",
          context: "local"
        });
        return false;
      }

      await db.notebooks.notebook(item.id).topics.add(value);
      setNotebooks();
      return true;
    },
    [setNotebooks]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getSelectedNotesCountInItem = React.useCallback(
    (item) => {
      switch (item.type) {
        case "notebook": {
          const noteIds = [];
          for (let topic of item.topics) {
            noteIds.push(...(db.notes?.topicReferences.get(topic.id) || []));
          }
          let count = 0;
          selectedItemsList.forEach((item) =>
            noteIds.indexOf(item.id) > -1 ? count++ : undefined
          );
          return count;
        }
        case "topic": {
          const noteIds = db.notes?.topicReferences.get(item.id);
          let count = 0;
          selectedItemsList.forEach((item) =>
            noteIds.indexOf(item.id) > -1 ? count++ : undefined
          );
          return count;
        }
      }
    },
    [selectedItemsList]
  );

  useEffect(() => {
    resetItemState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetItemState = useCallback(
    (state) => {
      setItemState(() => {
        const itemState = {};
        const notebooks = db.notebooks.all;
        for (let notebook of notebooks) {
          itemState[notebook.id] = state
            ? state
            : areAllSelectedItemsInAllTopics(notebook, selectedItemsList) &&
              getSelectedNotesCountInItem(notebook, selectedItemsList) > 0
            ? "selected"
            : getSelectedNotesCountInItem(notebook, selectedItemsList) > 0
            ? "intermediate"
            : "deselected";
          if (itemState[notebook.id] === "selected") {
            contextValue.select(notebook);
          }
          for (let topic of notebook.topics) {
            itemState[topic.id] = state
              ? state
              : areAllSelectedItemsInTopic(topic, selectedItemsList) &&
                getSelectedNotesCountInItem(topic, selectedItemsList)
              ? "selected"
              : getSelectedNotesCountInItem(topic, selectedItemsList) > 0
              ? "intermediate"
              : "deselected";
            if (itemState[topic.id] === "selected") {
              contextValue.select(topic);
            }
          }
        }
        return itemState;
      });
    },
    [contextValue, getSelectedNotesCountInItem, selectedItemsList]
  );

  const getItemsForItem = (item) => {
    switch (item.type) {
      case "notebook":
        return item.topics?.filter((t) => t.type === "topic");
    }
  };

  function areAllSelectedItemsInAllTopics(notebook, items) {
    return items.every((item) => {
      return notebook.topics.every((topic) => {
        return db.notes.topicReferences.get(topic.id).indexOf(item.id) > -1;
      });
    });
  }

  function areAllSelectedItemsInTopic(topic, items) {
    return items.every((item) => {
      return db.notes.topicReferences.get(topic.id).indexOf(item.id) > -1;
    });
  }

  const updateItemState = useCallback(function (item, state) {
    setItemState((itemState) => {
      const mergeState = {
        [item.id]: state
      };
      const notebooks = db.notebooks.all;
      const notebook =
        item.type === "notebook"
          ? item
          : notebooks.find((n) => n.id === item.notebookId);
      const intermediate = notebook.topics.some((topic) => {
        return topic.id === item.id
          ? state === "selected"
          : itemState[topic.id] === "selected";
      });
      if (intermediate) mergeState[notebook.id] = "intermediate";
      const selected = notebook.topics.every((topic) => {
        return topic.id === item.id
          ? state === "selected"
          : itemState[topic.id] === "selected";
      });
      if (selected) mergeState[notebook.id] = "selected";
      if (!selected && !intermediate) mergeState[notebook.id] = "deselected";

      return {
        ...itemState,
        ...mergeState
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      enabled: multiSelect,
      toggleSelection: (item) => {
        setItemState((itemState) => {
          if (itemState[item.id] === "selected") {
            updateItemState(item, "deselected");
          } else {
            updateItemState(item, "selected");
          }

          return itemState;
        });
      },
      setMultiSelect: setMultiSelect,
      deselect: (item) => {
        updateItemState(item, "deselected");
      },
      select: (item) => {
        updateItemState(item, "selected");
      },
      deselectAll: (state) => {
        resetItemState(state);
      }
    }),
    [multiSelect, resetItemState, updateItemState]
  );

  const getItemFromId = (id) => {
    for (const nb of notebooks) {
      if (nb.id === id) return nb;
      for (const tp of nb.topics) {
        if (tp.id === id) return tp;
      }
    }
  };

  const onSave = async () => {
    for (const id in itemState) {
      const item = getItemFromId(id);
      if (item.type === "notebook") continue;
      const noteIds = selectedItemsList.map((n) => n.id);
      if (itemState[id] === "selected") {
        await db.notes.addToNotebook(
          {
            topic: item.id,
            id: item.notebookId,
            rebuildCache: true
          },
          ...noteIds
        );
      } else if (itemState[id] === "deselected") {
        await db.notes.removeFromNotebook(
          {
            id: item.notebookId,
            topic: item.id,
            rebuildCache: true
          },
          ...noteIds
        );
      }
    }
    Navigation.queueRoutesForUpdate(
      "Notes",
      "Favorites",
      "ColoredNotes",
      "TaggedNotes",
      "TopicNotes"
    );
    setNotebooks();
    SearchService.updateAndSearch();
    actionSheetRef.current?.hide();
  };

  return (
    <>
      <Dialog context="move_note" />
      <View>
        <TouchableOpacity
          style={{
            width: "100%",
            height: "100%",
            position: "absolute"
          }}
          onPress={() => {
            Keyboard.dismiss();
          }}
        />
        <View
          style={{
            paddingHorizontal: 12,
            justifyContent: "space-between",
            flexDirection: "row",
            alignItems: "flex-start"
          }}
        >
          <DialogHeader
            style={{
              minHeight: 10,
              flexShrink: 1
            }}
            title="Select notebooks"
            paragraph={
              !multiSelect
                ? "Long press to enable multi-select."
                : "Select topics you want to add note(s) to."
            }
          />
          <Button
            height={35}
            style={{
              borderRadius: 100,
              paddingHorizontal: 24,
              alignSelf: "flex-start"
            }}
            title="Save"
            type={"accent"}
            onPress={onSave}
          />
        </View>

        {multiSelect ? (
          <View
            style={{
              paddingHorizontal: 12
            }}
          >
            <Button
              title="Reset selection"
              height={30}
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 0
              }}
              onPress={() => {
                resetItemState();
                setMultiSelect(false);
              }}
            />
          </View>
        ) : null}

        <SelectionProvider value={contextValue}>
          <FilteredList
            onMomentumScrollEnd={() => {
              actionSheetRef.current?.handleChildScrollEnd();
            }}
            style={{
              paddingHorizontal: 12
            }}
            ListEmptyComponent={
              notebooks.length > 0 ? null : (
                <View
                  style={{
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center"
                  }}
                >
                  <Icon name="book-outline" color={colors.icon} size={100} />
                  <Paragraph style={{ marginBottom: 10 }}>
                    You do not have any notebooks.
                  </Paragraph>
                </View>
              )
            }
            data={notebooks}
            hasHeaderSearch={true}
            renderItem={({ item, index }) => (
              <ListItem
                item={item}
                key={item.id}
                index={index}
                intermediate={itemState[item.id] === "intermediate"}
                removed={
                  itemState[item.id] === "deselected" &&
                  getSelectedNotesCountInItem(item) > 0
                }
                isSelected={itemState[item.id] === "selected"}
                infoText={
                  <>
                    {item.topics.length === 1
                      ? item.topics.length + " topic"
                      : item.topics.length + " topics"}
                  </>
                }
                getListItems={getItemsForItem}
                getSublistItemProps={(topic) => ({
                  selected: itemState[topic.id] === "selected",
                  intermediate: itemState[topic.id] === "intermediate",
                  isSelected: itemState[topic.id] === "selected",
                  removed:
                    itemState[topic.id] === "deselected" &&
                    getSelectedNotesCountInItem(topic) > 0,
                  style: {
                    marginBottom: 0,
                    height: 40
                  },
                  onPress: (item) => {
                    const currentState = itemState[item.id];
                    if (currentState !== "selected") {
                      resetItemState("deselected");
                      contextValue.select(item);
                      updateItemState(
                        notebooks.find((n) => n.id === item.notebookId),
                        "intermediate"
                      );
                    } else {
                      contextValue.deselect(item);
                    }
                  },
                  key: item.id,
                  type: "transparent"
                })}
                icon={(expanded) => ({
                  name: expanded ? "chevron-up" : "chevron-down",
                  color: expanded ? colors.accent : colors.pri
                })}
                onScrollEnd={() => {
                  actionSheetRef.current?.handleChildScrollEnd();
                }}
                hasSubList={true}
                hasHeaderSearch={false}
                type="grayBg"
                sublistItemType="topic"
                onAddItem={(title) => {
                  return onAddTopic(title, item);
                }}
                onAddSublistItem={(item) => {
                  openAddTopicDialog(item);
                }}
              />
            )}
            itemType="notebook"
            onAddItem={async (title) => {
              return await onAddNotebook(title);
            }}
            ListFooterComponent={
              <View
                style={{
                  height: 200
                }}
              />
            }
          />
        </SelectionProvider>
      </View>
    </>
  );
};
