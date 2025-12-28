function readUint32(data, offset) {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
}

function parseVMD(data) {
  const decoder = new TextDecoder('shift-jis');
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  const header = decoder.decode(data.slice(0, 30)).replace(/\0/g, '');
  offset += 30;

  const modelName = decoder.decode(data.slice(offset, offset + 20)).replace(/\0/g, '');
  offset += 20;

  const boneKeyCount = dv.getUint32(offset, true);
  offset += 4;

  const boneMap = new Map();

  for (let i = 0; i < boneKeyCount; i++) {
    const name = decoder.decode(data.slice(offset, offset + 15)).replace(/\0/g, '');
    const frame = dv.getUint32(offset + 15, true);

    const px = dv.getFloat32(offset + 19, true);
    const py = dv.getFloat32(offset + 23, true);
    const pz = dv.getFloat32(offset + 27, true);
    const rx = dv.getFloat32(offset + 31, true);
    const ry = dv.getFloat32(offset + 35, true);
    const rz = dv.getFloat32(offset + 39, true);
    const rw = dv.getFloat32(offset + 43, true);

    const x_ax = data[offset + 47];
    const y_ax = data[offset + 48];
    const z_ax = data[offset + 49 + 16];
    const r_ax = data[offset + 50 + 16];
    
    const x_ay = data[offset + 51];
    const y_ay = data[offset + 52];
    const z_ay = data[offset + 53];
    const r_ay = data[offset + 54];
    
    const x_bx = data[offset + 55];
    const y_bx = data[offset + 56];
    const z_bx = data[offset + 57];
    const r_bx = data[offset + 58];
    
    const x_by = data[offset + 59];
    const y_by = data[offset + 60];
    const z_by = data[offset + 61];
    const r_by = data[offset + 62];

    if (!boneMap.has(name)) boneMap.set(name, []);
    boneMap.get(name).push({
      name,
      frame,
      pos: { x: px, y: py, z: pz },
      rot: { x: rx, y: ry, z: rz, w: rw },
      curve: {
        x: [x_ax / 127, x_ay / 127, x_bx / 127, x_by / 127],
        y: [y_ax / 127, y_ay / 127, y_bx / 127, y_by / 127],
        z: [z_ax / 127, z_ay / 127, z_bx / 127, z_by / 127],
        r: [r_ax / 127, r_ay / 127, r_bx / 127, r_by / 127]
      }
    });

    offset += 111;
  }

  const morphKeyCount = dv.getUint32(offset, true);
  offset += 4;

  const morphMap = new Map();

  for (let i = 0; i < morphKeyCount; i++) {
    const name = decoder.decode(data.slice(offset, offset + 15)).replace(/\0/g, '');
    const frame = dv.getUint32(offset + 15, true);
    const weight = dv.getFloat32(offset + 19, true);

    if (!morphMap.has(name)) morphMap.set(name, []);
    morphMap.get(name).push({ name, frame, weight });

    offset += 23;
  }

  if (offset + 4 <= data.length) {
    const cameraCount = dv.getUint32(offset, true);
    offset += 4 + cameraCount * 61;
  }

  if (offset + 4 <= data.length) {
    const lightCount = dv.getUint32(offset, true);
    offset += 4 + lightCount * 28;
  }

  if (offset + 4 <= data.length) {
    const selfShadowCount = dv.getUint32(offset, true);
    offset += 4 + selfShadowCount * 9;
  }

  let ikCount = 0;
  if (offset + 4 <= data.length) {
    ikCount = dv.getUint32(offset, true);
  }

  const bones = [];
  for (const [name, list] of boneMap.entries()) {
    if (list.length < 2) continue;
    for (const b of list) bones.push(b);
  }

  const morphs = [];
  for (const [name, list] of morphMap.entries()) {
    if (list.length < 2) continue;
    for (const m of list) morphs.push(m);
  }

  return {
    header,
    modelName,
    boneKeyCount,
    morphKeyCount,
    ikCount,
    bones,
    morphs
  };
}

function isZeroBone(b) {
  return b.pos.x === 0 && b.pos.y === 0 && b.pos.z === 0 &&
         b.rot.x === 0 && b.rot.y === 0 && b.rot.z === 0 && b.rot.w === 0;
}
