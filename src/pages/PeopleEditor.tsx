import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePeople, useUpdatePerson, useCreatePerson, useDeletePerson } from '../hooks/usePeople';
import { supabase } from '../lib/supabase';
import { useI18n, type TranslationKey } from '../lib/i18n';
import type { Person } from '../types';

interface EditingPerson extends Person {
  isNew?: boolean;
}

export function PeopleEditor() {
  const { data: people = [], isLoading } = usePeople();
  const updatePerson = useUpdatePerson();
  const createPerson = useCreatePerson();
  const deletePerson = useDeletePerson();
  const { t, translateName, translateRole } = useI18n();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingPerson | null>(null);
  const [uploading, setUploading] = useState<'avatar' | 'avatar2' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const startEditing = (person: Person) => {
    setEditingId(person.id);
    setEditForm({ ...person });
    setMessage(null);
  };

  const startCreating = () => {
    const newPerson: EditingPerson = {
      id: 'new',
      name: '',
      role: '',
      avatar_url: '',
      avatar_url_2: '',
      isNew: true,
    };
    setEditingId('new');
    setEditForm(newPerson);
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editForm) return;

    try {
      if (editForm.isNew) {
        const { isNew, id, ...personData } = editForm;
        await createPerson.mutateAsync({
          ...personData,
          avatar_url: personData.avatar_url || undefined,
          avatar_url_2: personData.avatar_url_2 || undefined,
        });
        setMessage({ type: 'success', text: t('person_created') });
      } else {
        await updatePerson.mutateAsync({
          id: editForm.id,
          name: editForm.name,
          role: editForm.role,
          avatar_url: editForm.avatar_url || undefined,
          avatar_url_2: editForm.avatar_url_2 || undefined,
        });
        setMessage({ type: 'success', text: t('changes_saved') });
      }
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;

    try {
      await deletePerson.mutateAsync(id);
      setMessage({ type: 'success', text: t('person_deleted') });
      if (editingId === id) {
        setEditingId(null);
        setEditForm(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const uploadImage = async (file: File, field: 'avatar_url' | 'avatar_url_2') => {
    if (!editForm) return;

    setUploading(field === 'avatar_url' ? 'avatar' : 'avatar2');
    setMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editForm.id === 'new' ? 'temp' : editForm.id}-${field}-${Date.now()}.${fileExt}`;

      console.log('Uploading file:', fileName);

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      console.log('Upload result:', { error: uploadError, data });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      setEditForm({ ...editForm, [field]: publicUrl });
      setMessage({ type: 'success', text: t('image_uploaded') });
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar_url' | 'avatar_url_2') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file, field);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            to="/week"
            className="text-blue-600 hover:underline text-sm"
          >
            {t('back_to_calendar')}
          </Link>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('people_editor')}</h1>
            <p className="text-gray-600">{t('manage_caregivers')}</p>
          </div>
          <button
            onClick={startCreating}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            {t('add_person')}
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {editingId === 'new' && editForm && (
            <div className="bg-white rounded-lg shadow-md p-6 border-2 border-green-400">
              <h3 className="font-bold text-lg mb-4">{t('new_person')}</h3>
              <PersonForm
                editForm={editForm}
                setEditForm={setEditForm}
                onSave={handleSave}
                onCancel={cancelEditing}
                uploading={uploading}
                fileInputRef={fileInputRef}
                fileInput2Ref={fileInput2Ref}
                onFileChange={handleFileChange}
                isSaving={createPerson.isPending}
                t={t}
              />
            </div>
          )}

          {people.map((person) => (
            <div key={person.id} className="bg-white rounded-lg shadow-md p-6">
              {editingId === person.id && editForm ? (
                <PersonForm
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onSave={handleSave}
                  onCancel={cancelEditing}
                  onDelete={() => handleDelete(person.id)}
                  uploading={uploading}
                  fileInputRef={fileInputRef}
                  fileInput2Ref={fileInput2Ref}
                  onFileChange={handleFileChange}
                  isSaving={updatePerson.isPending}
                  t={t}
                />
              ) : (
                <PersonDisplay person={person} onEdit={() => startEditing(person)} t={t} translateName={translateName} translateRole={translateRole} />
              )}
            </div>
          ))}

          {people.length === 0 && editingId !== 'new' && (
            <div className="text-center py-12 text-gray-500">
              {t('no_people_yet')}
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          {t('tip_dual_avatar')}
        </div>
      </div>
    </div>
  );
}

interface PersonDisplayProps {
  person: Person;
  onEdit: () => void;
  t: (key: TranslationKey) => string;
  translateName: (name: string) => string;
  translateRole: (role: string) => string;
}

function PersonDisplay({ person, onEdit, t, translateName, translateRole }: PersonDisplayProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex -space-x-2">
        {person.avatar_url ? (
          <img
            src={person.avatar_url}
            alt={person.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border-2 border-white shadow">
            <span className="text-2xl">{translateName(person.name).charAt(0)}</span>
          </div>
        )}
        {person.avatar_url_2 && (
          <img
            src={person.avatar_url_2}
            alt={`${person.name} (2)`}
            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
          />
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg">{translateName(person.name)}</h3>
        <p className="text-gray-600">{translateRole(person.role)}</p>
      </div>
      <button
        onClick={onEdit}
        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        {t('edit')}
      </button>
    </div>
  );
}

interface PersonFormProps {
  editForm: EditingPerson;
  setEditForm: (form: EditingPerson) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  uploading: 'avatar' | 'avatar2' | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileInput2Ref: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar_url' | 'avatar_url_2') => void;
  isSaving: boolean;
  t: (key: TranslationKey) => string;
}

function PersonForm({
  editForm,
  setEditForm,
  onSave,
  onCancel,
  onDelete,
  uploading,
  fileInputRef,
  fileInput2Ref,
  onFileChange,
  isSaving,
  t,
}: PersonFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('name')}</label>
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="w-full border rounded-lg p-2"
            placeholder={t('name_placeholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('role')}</label>
          <input
            type="text"
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            className="w-full border rounded-lg p-2"
            placeholder={t('role_placeholder')}
          />
        </div>
      </div>

      {/* Avatar 1 */}
      <div>
        <label className="block text-sm font-medium mb-1">{t('avatar')}</label>
        <div className="flex items-center gap-4">
          {editForm.avatar_url ? (
            <img
              src={editForm.avatar_url}
              alt="Avatar preview"
              className="w-20 h-20 rounded-full object-cover border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border">
              {t('no_image')}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={editForm.avatar_url || ''}
              onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder={t('image_url_placeholder')}
            />
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => onFileChange(e, 'avatar_url')}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading === 'avatar'}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading === 'avatar' ? t('uploading') : t('upload_image')}
              </button>
              {editForm.avatar_url && (
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, avatar_url: '' })}
                  className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                >
                  {t('remove')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Avatar 2 (for dual entries) */}
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('second_avatar')} <span className="text-gray-400 font-normal">{t('second_avatar_hint')}</span>
        </label>
        <div className="flex items-center gap-4">
          {editForm.avatar_url_2 ? (
            <img
              src={editForm.avatar_url_2}
              alt="Avatar 2 preview"
              className="w-20 h-20 rounded-full object-cover border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border">
              {t('no_image')}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={editForm.avatar_url_2 || ''}
              onChange={(e) => setEditForm({ ...editForm, avatar_url_2: e.target.value })}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder={t('image_url_placeholder')}
            />
            <div className="flex gap-2">
              <input
                ref={fileInput2Ref}
                type="file"
                accept="image/*"
                onChange={(e) => onFileChange(e, 'avatar_url_2')}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInput2Ref.current?.click()}
                disabled={uploading === 'avatar2'}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading === 'avatar2' ? t('uploading') : t('upload_image')}
              </button>
              {editForm.avatar_url_2 && (
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, avatar_url_2: '' })}
                  className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
                >
                  {t('remove')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <button
          onClick={onSave}
          disabled={isSaving || !editForm.name.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isSaving ? t('saving') : t('save')}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          {t('cancel')}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 ml-auto"
          >
            {t('delete')}
          </button>
        )}
      </div>
    </div>
  );
}
