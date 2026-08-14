import React, { useRef } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  onOK: (signature: string) => void;
  onCancel: () => void;
}

export default function SignatureModal({ visible, onOK, onCancel }: Props) {
  const ref = useRef<any>(null);

  const handleOK = (signature: string) => {
    onOK(signature);
  };

  const handleEmpty = () => {
    alert('Please sign before submitting.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.modal}>
          <Text style={styles.header}>Sign Below</Text>
          <View style={styles.signatureContainer}>
            <SignatureScreen
              ref={ref}
              onOK={handleOK}
              onEmpty={handleEmpty}
              descriptionText="Sign"
              clearText="Clear"
              confirmText="Save"
              webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
            />
          </View>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={() => ref.current?.clearSignature()}>
              <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => ref.current?.readSignature()}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: colors.background, borderRadius: 12, padding: 20, flex: 0.8 },
  header: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 10, textAlign: 'center' },
  signatureContainer: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', marginBottom: 20 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1, padding: 12, backgroundColor: colors.secondary, marginHorizontal: 5, borderRadius: 8, alignItems: 'center' },
  saveButton: { backgroundColor: colors.success },
  cancelButton: { backgroundColor: colors.error },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
