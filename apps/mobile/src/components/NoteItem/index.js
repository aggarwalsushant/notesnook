import React, {useState, createRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';

import {
  COLOR_SCHEME,
  SIZE,
  br,
  ph,
  pv,
  opacity,
  FONT,
  WEIGHT,
} from '../../common/common';

import Icon from 'react-native-vector-icons/Feather';
import {Reminder} from '../Reminder';
import {getElevation, timeSince, ToastEvent} from '../../utils/utils';
import NavigationService from '../../services/NavigationService';
import Menu, {MenuItem, MenuDivider} from 'react-native-material-menu';
import {Dialog} from '../Dialog';
import {VaultDialog} from '../VaultDialog';
import {db} from '../../../App';

const w = Dimensions.get('window').width;
const h = Dimensions.get('window').height;

const NoteItem = props => {
  const [colors, setColors] = useState(COLOR_SCHEME);
  const [visible, setVisible] = useState(false);
  const [vaultDialog, setVaultDialog] = useState(false);
  const item = props.item;

  let show = null;

  let setMenuRef = {};

  const onMenuHide = () => {
    if (show) {
      if (show === 'delete') {
        setVisible(true);
        show = null;
      } else if (show == 'vault') {
        setVaultDialog(true);
        show = null;
      }
    }
  };

  const hideMenu = () => {
    setMenuRef[props.index].hide();
  };

  const showMenu = () => {
    setMenuRef[props.index].show();
  };

  const deleteItem = async () => {
    await db.deleteNotes([item]);
    ToastEvent.show('Note moved to trash', 'success', 3000);
    setVisible(false);
    props.refresh();
  };
  return (
    <View
      style={{
        marginHorizontal: w * 0.05,
        paddingVertical: pv,

        borderRadius: br,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: ph,
        width: Platform.isPad ? '95%' : '90%',
        alignSelf: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.nav,
      }}>
      <Dialog
        visible={visible}
        title="Delete note"
        icon="trash"
        paragraph="Do you want to delete this note?"
        positiveText="Delete"
        positivePress={deleteItem}
        close={() => {
          setVisible(false);
        }}
      />
      <VaultDialog visible={vaultDialog} />

      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          NavigationService.navigate('Editor', {
            note: item,
          });
        }}
        style={{
          paddingLeft: ph,
          width: '100%',
        }}>
        <>
          <Text
            numberOfLines={1}
            style={{
              color: colors.pri,
              fontSize: SIZE.md,
              fontFamily: WEIGHT.bold,
              maxWidth: '100%',
              marginBottom: 5,
            }}>
            {item.title.replace('\n', '')}
          </Text>
          <View
            style={{
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              width: '100%',
            }}>
            <Text
              numberOfLines={2}
              style={{
                fontSize: SIZE.xs + 2,
                color: colors.icon,
                fontFamily: WEIGHT.regular,
                width: '100%',
                maxWidth: '100%',
                paddingRight: ph,
              }}>
              {item.headline}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}>
              <Icon
                style={{width: 30}}
                name="lock"
                size={SIZE.sm}
                color={colors.icon}
              />
              <Icon
                style={{width: 30}}
                name="star"
                size={SIZE.sm}
                color={colors.icon}
              />

              <Text
                style={{
                  color: colors.accent,
                  fontSize: SIZE.xxs + 2,
                  textAlignVertical: 'center',
                  fontFamily: WEIGHT.regular,
                }}>
                {timeSince(item.dateCreated) + '  '}
              </Text>
            </View>
          </View>
        </>
      </TouchableOpacity>

      <View
        style={{
          width: w * 0.05,
          justifyContent: 'center',
          minHeight: 70,
          alignItems: 'center',
          paddingRight: ph,
        }}>
        <Menu
          style={{
            borderRadius: 5,
            backgroundColor: colors.nav,
          }}
          onHidden={onMenuHide}
          ref={ref => (setMenuRef[props.index] = ref)}
          button={
            <TouchableOpacity
              style={{
                width: w * 0.05,
                justifyContent: 'center',
                minHeight: 70,
                alignItems: 'center',
              }}
              onPress={showMenu}>
              <Icon name="more-vertical" size={SIZE.lg} color={colors.icon} />
            </TouchableOpacity>
          }>
          <MenuItem
            textStyle={{
              color: colors.pri,

              fontFamily: WEIGHT.regular,
              fontSize: SIZE.sm,
            }}>
            <Icon name="star" size={SIZE.sm} color={colors.icon} />
            {'  '}Pin
          </MenuItem>
          <MenuItem
            onPress={() => {
              hideMenu();
              ToastEvent.show(
                'Note added to favorites.',
                'success',
                3000,
                () => {},
                'Ok',
              );
            }}
            textStyle={{
              color: colors.pri,

              fontFamily: WEIGHT.regular,
              fontSize: SIZE.sm,
            }}>
            <Icon name="star" size={SIZE.sm} color={colors.icon} />
            {'  '}Favorite
          </MenuItem>

          <MenuItem
            textStyle={{
              color: colors.pri,
              fontFamily: WEIGHT.regular,
              fontSize: SIZE.sm,
            }}>
            <Icon name="share" size={SIZE.sm} color={colors.icon} />
            {'  '}Share
          </MenuItem>

          <MenuItem
            onPress={() => {
              hideMenu();
              NavigationService.push('Folders', {
                note: item,
                title: 'Choose Notebook',
                isMove: true,
                hideMore: true,
              });
            }}
            textStyle={{
              color: colors.pri,

              fontFamily: WEIGHT.regular,
              fontSize: SIZE.sm,
            }}>
            <Icon name="arrow-right" size={SIZE.sm} color={colors.icon} />
            {'  '}Move
          </MenuItem>
          <MenuItem
            onPress={() => {
              show = 'vault';
              hideMenu(true);
            }}
            textStyle={{
              color: colors.pri,
              fontFamily: WEIGHT.regular,
              fontSize: SIZE.sm,
            }}>
            <Icon name="lock" size={SIZE.sm} color={colors.icon} />
            {'  '}Lock
          </MenuItem>

          <MenuItem
            onPress={() => {
              show = 'delete';
              hideMenu();
            }}
            textStyle={{
              color: colors.pri,

              fontFamily: WEIGHT.regular,
              fontSize: SIZE.sm,
            }}>
            <Icon name="trash" size={SIZE.sm} color={colors.icon} />
            {'  '}Delete
          </MenuItem>
          <MenuDivider />
          <MenuItem
            disabled={true}
            textStyle={{
              color: colors.icon,

              fontFamily: WEIGHT.regular,
              fontSize: SIZE.xs,
            }}
            style={{
              paddingVertical: 0,
              margin: 0,
              height: 30,
            }}>
            Notebook: School Notes
          </MenuItem>
          <MenuItem
            disabled={true}
            textStyle={{
              color: colors.icon,

              fontFamily: WEIGHT.regular,
              fontSize: SIZE.xs,
            }}
            style={{
              paddingVertical: 0,
              margin: 0,
              height: 30,
              paddingBottom: 10,
            }}>
            {'  '}- Topic: Physics
          </MenuItem>

          <MenuItem
            disabled={true}
            textStyle={{
              color: colors.icon,

              fontFamily: WEIGHT.regular,
              fontSize: SIZE.xs,
            }}
            style={{
              paddingVertical: 0,
              margin: 0,
              height: 30,
              paddingBottom: 10,
            }}>
            Created on: {new Date(item.dateCreated).toISOString().slice(0, 10)}
          </MenuItem>
        </Menu>
      </View>
    </View>
  );
};

export default NoteItem;
