const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, nodes, text, buttons, click, inputs, project, sample } = require('./harness.cjs');

test('numbering stays unique after deletion and custom IDs', () => {
  const { nextSampleNumber } = harness().load('src/utils/sampleValidation.ts');
  assert.equal(nextSampleNumber([sample('a', 'M-01'), sample('b', 'M-03')], 'M'), 'M-04');
  assert.equal(nextSampleNumber([sample('a', ' a-09 ')], 'A'), 'A-10');
});

test('measurement validation preserves decimals and rejects invalid or non-finite readings', () => {
  const { calculateVolume } = harness().load('src/utils/sampleValidation.ts');
  assert.equal(calculateVolume('15', '2.5'), '37.5');
  assert.equal(calculateVolume('15', '5'), '75');
  for (const value of ['', '-1', '0', 'NaN', 'Infinity', '15junk', '1e999']) assert.equal(calculateVolume(value, '5'), null);
});

test('sample completion rejects duplicate IDs, missing photos, description and mold test codes', () => {
  const { sampleError } = harness().load('src/utils/sampleValidation.ts');
  assert.equal(sampleError(sample(), [], true), null);
  assert.match(sampleError(sample('second', ' m-01 '), [sample()], true), /already used/);
  assert.match(sampleError({ ...sample(), photoUris: [] }, [], true), /photo/);
  assert.match(sampleError({ ...sample(), description: ' ' }, [], true), /description/);
  assert.match(sampleError({ ...sample(), sampleCode: '' }, [], true), /test code/);
  assert.equal(sampleError({ ...sample(), sampleCode: '' }, [], false), null);
});

test('project switching restores the full CoC and selected inspection date', async () => {
  const h = harness(); await h.state().addProject(project('A'));
  await h.state().addSample(sample()); await h.state().updateCoCData({ inspectorSignature: 'sig-A', specialInstructions: 'A only' });
  await h.state().addProject(project('B')); await h.state().updateCoCData({ inspectorSignature: 'sig-B', specialInstructions: 'B only' });
  h.state().setActiveProjectId('A');
  assert.equal(h.state().cocData.inspectorSignature, 'sig-A');
  assert.equal(h.state().cocData.specialInstructions, 'A only');
  assert.equal(h.state().cocData.samplingDate, '01/02/2025');
  assert.equal(h.state().samples.length, 1); await h.flush();
});

test('edit project changes metadata without creating a project or dropping samples', async () => {
  const h = harness(); await h.state().addProject(project('A')); await h.state().addSample(sample());
  const render = h.mount('NewProjectScreen', { route: { params: { projectId: 'A' } } });
  let tree = render(); inputs(tree).find(n => n.props.value === 'QA site').props.onChangeText('Updated site');
  tree = render(); await click(tree, 'Save changes');
  assert.equal(h.state().projects.length, 1); assert.equal(h.state().projects[0].samples.length, 1);
  assert.equal(h.state().projects[0].address, 'Updated site');
  assert.equal(h.state().cocData.contactAddress, 'Updated site'); await h.flush();
});

test('blank review does not create a phantom sample', async () => {
  const h = harness(); await h.state().addProject(project('A'));
  const render = h.mount('SampleLoggerScreen'); await click(render(), 'Review all samples');
  assert.equal(h.state().samples.length, 0); assert.equal(h.navigation.at(-1)[1], 'ProjectSamples'); await h.flush();
});

test('editing a sample saves once and returns to review', async () => {
  const h = harness(); await h.state().addProject(project('A')); await h.state().addSample(sample());
  const render = h.mount('SampleLoggerScreen', { route: { params: { sampleId: 's1' } } });
  let tree = render(); inputs(tree).find(n => n.props.value === 'Bedroom').props.onChangeText('Hallway');
  tree = render(); await click(tree, 'Save changes');
  assert.equal(h.state().samples.length, 1); assert.equal(h.state().samples[0].description, 'Hallway');
  assert.equal(h.navigation.at(-1)[1], 'ProjectSamples'); await h.flush();
});

test('new sample loop resets fields without creating a blank sample on review', async () => {
  const h = harness(); await h.state().addProject(project('A'));
  const render = h.mount('SampleLoggerScreen'); let tree = render();
  inputs(tree).find(n => n.props.placeholder === 'Code from your lab').props.onChangeText('1');
  inputs(tree).find(n => n.props.multiline).props.onChangeText('Bedroom');
  await click(tree, 'Take photo'); tree = render(); await click(tree, 'Done — next sample'); tree = render();
  assert.equal(h.state().samples.length, 1); assert.equal(inputs(tree)[0].props.value, 'M-02');
  await click(tree, 'Review all samples'); assert.equal(h.state().samples.length, 1); await h.flush();
});

test('camera opens markup immediately and cancel keeps the durable original', async () => {
  const h = harness(); await h.state().addProject(project('A'));
  const render = h.mount('SampleLoggerScreen'); await click(render(), 'Take photo'); const tree = render();
  const photo = nodes(tree).find(n => n.type === 'Image');
  assert.ok(photo.props.source.uri.startsWith('file:///documents/inspections/'));
  const editor = nodes(tree).find(n => n.type === 'ImageEditorModal');
  assert.equal(editor.props.visible, true);
  assert.equal(editor.props.imageUri, photo.props.source.uri);
  editor.props.onCancel();
  const canceled = render();
  assert.equal(nodes(canceled).find(n => n.type === 'ImageEditorModal').props.visible, false);
  assert.equal(nodes(canceled).find(n => n.type === 'Image').props.source.uri, photo.props.source.uri);
  assert.equal(h.preventRemove.dirty, true); await h.flush();
});

test('saving immediate markup replaces the captured photo without duplicating it', async () => {
  const h = harness(); await h.state().addProject(project('A')); await h.state().addSample(sample());
  const render = h.mount('SampleLoggerScreen', { route: { params: { sampleId: 's1' } } });
  await click(render(), 'Add');
  const editor = nodes(render()).find(n => n.type === 'ImageEditorModal');
  editor.props.onSave('file:///documents/inspections/edited.jpg');
  const photos = nodes(render()).filter(n => n.type === 'Image');
  assert.equal(photos.length, 2);
  assert.equal(photos[0].props.source.uri, sample().photoUris[0]);
  assert.equal(photos[1].props.source.uri, 'file:///documents/inspections/edited.jpg');
});

async function photoEditor(h) {
  const render = h.mount('../components/ImageEditorModal', { visible: true, imageUri: 'data:image/jpeg;base64,original', onSave: uri => { h.savedPhoto = uri; }, onCancel() {} });
  render(); await Promise.resolve();
  let view = nodes(render()).find(n => n.type === 'WebView');
  view.props.ref.current = { injectJavaScript: script => { (h.editorScripts ||= []).push(script); } };
  await view.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'READY' }) } });
  return { render, exportImage: () => view.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'EXPORT_IMAGE', data: 'data:image/jpeg;base64,edited-with-markup' }) } }) };
}

test('gallery exports current markup, cleans the temporary file and leaves editing open', async () => {
  const h = harness(); const editor = await photoEditor(h);
  await click(editor.render(), 'Save to gallery');
  await nodes(editor.render()).find(n => n.props?.accessibilityLabel === 'Save photo to gallery').props.onPress();
  assert.equal(h.editorScripts.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.galleryPermissionArgs)), [true, ['photo']]);
  await editor.exportImage();
  assert.equal(h.exportedPhotos[0].data, 'edited-with-markup');
  assert.equal(h.galleryPhotos[0], h.exportedPhotos[0].uri);
  assert.equal(h.deletedFiles[0], h.galleryPhotos[0]);
  assert.equal(h.savedPhoto, undefined);
  await click(editor.render(), 'Save photo'); await editor.exportImage();
  assert.ok(h.savedPhoto.endsWith('.jpg'));
  assert.equal(h.galleryPhotos.length, 1);
});

test('gallery permission denial and write failure leave sample saving available', async () => {
  const h = harness(); const editor = await photoEditor(h);
  h.galleryGranted = false;
  await click(editor.render(), 'Save to gallery');
  assert.equal(h.editorScripts, undefined);
  h.galleryGranted = true; h.galleryFailure = true;
  await click(editor.render(), 'Save to gallery'); await editor.exportImage();
  assert.equal(h.galleryPhotos, undefined);
  assert.equal(h.deletedFiles.length, 1);
  assert.equal(h.alerts.at(-1)[0], 'Save failed');
  await click(editor.render(), 'Save photo'); await editor.exportImage();
  assert.ok(h.savedPhoto);
});

test('cloud writes save samples inside their owning project, never in the global pool', async () => {
  const h = harness(); await h.state().addProject(project('A')); await h.state().addSample(sample()); await h.flush();
  const write = h.writes.filter(w => w.path.endsWith('/projects/A')).at(-1);
  assert.equal(write.data.samples.length, 1); assert.equal(write.data.samples[0].name, 'M-01');
  assert.equal(h.writes.some(w => w.path.includes('/samples/')), false);
});

test('offline changes stay queued and retry successfully', async () => {
  const h = harness(); h.failWrites = true;
  await h.state().addProject(project('A')); await h.state().addSample(sample()); await h.flush();
  assert.equal(h.state().samples.length, 1); assert.ok(h.state().pendingWrites['projects/A']);
  h.failWrites = false; await h.flush(); assert.equal(Object.keys(h.state().pendingWrites).length, 0);
  assert.equal(h.writes.at(-1).data.samples.length, 1);
});

test('cloud refresh cannot replace pending local samples with stale remote snapshots', async () => {
  const h = harness(); h.failWrites = true;
  await h.state().addProject(project('A')); await h.state().addSample(sample());
  h.remote.projects = [{ ...project('A'), samples: [] }]; await h.state().syncFromFirestore();
  assert.equal(h.state().projects[0].samples.length, 1); assert.equal(h.state().samples.length, 1); await h.flush();
});

test('legacy global samples are preserved for recovery and never mixed into the active project', async () => {
  const h = harness(); await h.state().addProject(project('A')); await h.flush();
  h.remote.projects = [{ ...project('A'), samples: [sample()] }]; h.remote.samples = [sample('other', 'OTHER-SITE')];
  await h.state().syncFromFirestore(); assert.equal(h.state().samples.length, 1);
  assert.equal(h.state().samples[0].name, 'M-01'); assert.equal(h.state().legacyUnassignedSamples[0].name, 'OTHER-SITE'); await h.flush();
});

test('migration preserves project evidence without attributing unassigned samples', () => {
  const h = harness(); const old = { projects: [{ ...project('A'), samples: [sample()] }], samples: [sample('unknown')], activeProjectId: 'A' };
  const migrated = h.persistOptions.migrate(old, 0);
  assert.equal(migrated.projects[0].samples.length, 1); assert.equal(migrated.legacyUnassignedSamples.length, 1);
  assert.equal(migrated.activeProjectId, null); assert.equal(migrated.needsProjectMigration, true);
});

test('deleting or clearing a project also clears active context', async () => {
  const h = harness(); await h.state().addProject(project('A')); await h.state().deleteProject('A');
  assert.equal(h.state().activeProjectId, null); assert.equal(h.state().samples.length, 0); await h.flush();
  await h.state().addProject(project('B')); await h.flush(); h.state().clearStore();
  assert.equal(h.state().activeProjectId, null); assert.equal(h.state().projects.length, 0);
});

test('CoC tab requires a real project', () => {
  const h = harness(); const render = h.mount('ChainOfCustodyScreen');
  assert.match(text(render()), /Choose a project first/);
});

async function mailHarness(platform, status) {
  const h = harness(); h.platform.OS = platform; h.mailStatus = status;
  await h.state().addProject(project('A')); await h.state().addSample(sample());
  const render = h.mount('SubmitCoCScreen', { route: { params: { prefillRecipient: 'lab@example.invalid' } } });
  h.send = () => click(render(), 'Open email with PDF'); return h;
}

test('iOS cancellation and drafts never mark a project submitted', async () => {
  for (const status of ['cancelled', 'saved']) {
    const h = await mailHarness('ios', status); await h.send();
    assert.equal(h.state().submissions.length, 0); assert.equal(h.state().projects[0].status, 'Draft'); await h.flush();
  }
});

test('Android handoff is Email Ready, not a claim of sending or delivery', async () => {
  const h = await mailHarness('android', 'sent'); await h.send();
  assert.equal(h.state().submissions[0].status, 'Email Ready'); assert.equal(h.state().projects[0].status, 'Email Ready');
  assert.equal(h.state().submissions[0].projectId, 'A'); assert.equal(h.alerts.at(-1)[0], 'Opened in email app'); await h.flush();
});

test('mail app reported sending updates the correct project even with duplicate PO numbers', async () => {
  const h = await mailHarness('ios', 'sent'); await h.state().addProject({ ...project('B'), poNumber: 'A' });
  h.state().setActiveProjectId('A'); await h.send();
  assert.equal(h.state().projects.find(p => p.id === 'A').status, 'Submitted');
  assert.equal(h.state().projects.find(p => p.id === 'B').status, 'Draft'); await h.flush();
});

test('oversized or missing attachments stop email and leave the project untouched', async () => {
  for (const oversized of [true, false]) {
    const h = await mailHarness('ios', 'sent');
    if (oversized) h.fileSize = 16 * 1024 * 1024; else h.missingFile = sample().photoUris[0];
    await h.send(); assert.equal(h.mail.length, 0); assert.equal(h.state().submissions.length, 0);
    assert.equal(h.state().projects[0].status, 'Draft'); await h.flush();
  }
});

test('photo toggle controls both attachments and the generated manifest', async () => {
  const h = await mailHarness('ios', 'sent'); await h.state().updateCoCData({ attachPhotosToEmail: false }); await h.send();
  assert.equal(h.mail[0].attachments.length, 1); assert.equal(h.mail[0].body.includes('Attached sample photos:'), false);
  assert.equal(h.state().submissions[0].photosCount, 0); await h.flush();
});

test('PDF uses measured decimal volumes, escapes text, and does not invent missing readings', async () => {
  const h = harness(); await h.state().addProject(project('A'));
  const { generatePDF } = h.load('src/utils/pdfGenerator.ts');
  const uri = await generatePDF(null, h.state().cocData, [{ ...sample(), description: '<QA & test>' }]);
  assert.ok(uri.startsWith('file:///documents/inspections/'));
  assert.ok(h.printed.at(-1).includes('37.5')); assert.ok(h.printed.at(-1).includes('&lt;QA &amp; test&gt;'));
  await generatePDF(null, h.state().cocData, [{ id: 'x', name: 'M-01', description: 'Legacy' }]);
  assert.equal(h.printed.at(-1).includes('<td class="text-center bold">75</td>'), false);
  await generatePDF(null, h.state().cocData, Array.from({ length: 16 }, (_, i) => sample(String(i), 'M-' + i)));
  assert.ok(h.printed.at(-1).includes('PAGE 2 of 2')); await h.flush();
});

test('PDF prints only filled sample rows and keeps the custody footer on a short form', async () => {
  const h = harness(); await h.state().addProject(project('A'));
  const { generatePDF } = h.load('src/utils/pdfGenerator.ts');
  await generatePDF(null, h.state().cocData, [sample()]);
  const oneSample = h.printed.at(-1);
  const sampleTables = [...oneSample.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)];
  assert.equal(sampleTables.length, 1);
  assert.equal((sampleTables[0][1].match(/<tr>/g) || []).length, 1);
  assert.ok(oneSample.includes('Received by (Courier / Lab):'));
  assert.ok(oneSample.includes('PAGE 1 of 1'));
  assert.equal(oneSample.includes('<td>&nbsp;</td>'), false);

  await generatePDF(null, h.state().cocData, Array.from({ length: 13 }, (_, i) => sample(String(i), 'M-' + i)));
  const twoPages = [...h.printed.at(-1).matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)];
  assert.deepEqual(twoPages.map(([, body]) => (body.match(/<tr>/g) || []).length), [12, 1]);
  await h.flush();
});

test('Email ready filter shows handoffs rather than submitted projects', async () => {
  const h = harness(); await h.state().addProject(project('ready')); await h.state().updateProject('ready', { status: 'Email Ready' });
  await h.state().addProject(project('sent')); await h.state().updateProject('sent', { status: 'Submitted' });
  const render = h.mount('ProjectsScreen'); await click(render(), 'Email ready');
  const list = nodes(render()).find(n => n.type === 'FlatList');
  assert.equal(list.props.data.length, 1); assert.equal(list.props.data[0].id, 'ready'); await h.flush();
});

test('local queue cannot be written into another signed-in account', async () => {
  const h = harness(); h.failWrites = true; await h.state().addProject(project('A')); await h.flush();
  h.auth.currentUser = { uid: 'another-user' }; h.failWrites = false; await h.flush();
  assert.equal(h.writes.length, 0); assert.ok(h.state().pendingWrites['projects/A']);
});

test('no mail app leaves the project as a draft', async () => {
  const h = await mailHarness('android', 'sent'); h.mailAvailable = false; await h.send();
  assert.equal(h.mail.length, 0); assert.equal(h.state().projects[0].status, 'Draft');
  assert.equal(h.alerts.at(-1)[0], 'Set up an email app'); await h.flush();
});

test('impossible inspection dates are rejected', () => {
  const { validInspectionDate } = harness().load('src/utils/sampleValidation.ts');
  assert.equal(validInspectionDate('02/29/2024'), true);
  for (const date of ['02/29/2025', '13/01/2026', '09/31/2026', 'not a date']) assert.equal(validInspectionDate(date), false);
});

test('legacy recovery requires an explicit project and preserves sample evidence', async () => {
  const h = harness(); await h.state().addProject(project('A'));
  h.store.setState({ legacyUnassignedSamples: [sample()] });
  await h.state().recoverLegacySample('s1', 'A');
  assert.equal(h.state().activeProjectId, 'A'); assert.equal(h.state().samples[0].photoUris[0], sample().photoUris[0]);
  assert.equal(h.state().legacyUnassignedSamples.length, 0); await h.flush();
});

test('upgrading copies existing cached photos into durable storage', async () => {
  const h = harness();
  h.store.setState({ projects: [{ ...project('A'), samples: [{ ...sample(), photoUris: ['file:///cache/old.jpg'] }] }], needsProjectMigration: true });
  await h.state().syncFromFirestore();
  assert.equal(h.state().needsProjectMigration, false);
  assert.ok(h.state().projects[0].samples[0].photoUris[0].startsWith('file:///documents/inspections/'));
  await h.flush();
});

test('editing submitted samples returns the project to draft and retires the stale project PDF', async () => {
  const h = harness(); await h.state().addProject(project('A')); await h.state().addSample(sample());
  await h.state().updateProject('A', { status: 'Submitted', pdfUri: 'file:///old.pdf' });
  await h.state().updateSample('s1', { description: 'Updated location' });
  assert.equal(h.state().projects[0].status, 'Draft'); assert.equal(h.state().projects[0].pdfUri, undefined);
  await h.flush();
});
