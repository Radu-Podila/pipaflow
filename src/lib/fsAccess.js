export const supportsFsAccess =
  typeof window !== 'undefined' && 'showOpenFilePicker' in window;

const JSON_TYPE = {
  description: 'Pipaflow JSON',
  accept: { 'application/json': ['.json'] },
};

export async function openJsonFile() {
  if (!supportsFsAccess) return null;
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [JSON_TYPE],
      multiple: false,
    });
    const file = await handle.getFile();
    const text = await file.text();
    return { handle, name: file.name, text };
  } catch (err) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}

export async function writeJsonToHandle(handle, payload) {
  const perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm !== 'granted') {
    const req = await handle.requestPermission({ mode: 'readwrite' });
    if (req !== 'granted') throw new Error('Acces la fișier refuzat');
  }
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}

export async function saveAsJsonFile(suggestedName, payload) {
  if (!supportsFsAccess) return null;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [JSON_TYPE],
    });
    await writeJsonToHandle(handle, payload);
    return { handle, name: handle.name };
  } catch (err) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}
