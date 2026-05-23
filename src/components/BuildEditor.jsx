import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BuildEditor.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const api = axios.create({
    baseURL: `${API_URL}/api`,
    timeout: 10000
});

function BuildEditor({ onClose, adminToken }) {
    const [build, setBuild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingMod, setEditingMod] = useState(null);
    const [isAddingMod, setIsAddingMod] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        curseForgeUrl: '',
        modrinthUrl: '',
        icon: '📦',
        required: false
    });
    const [buildForm, setBuildForm] = useState({
        curseForgeUrl: '',
        modrinthUrl: '',
        description: '',
        version: '',
        minecraftVersion: '',
        forgeVersion: ''
    });
    const [message, setMessage] = useState({ text: '', type: '' });

    const getAuthHeaders = () => ({ headers: { 'Authorization': adminToken } });

    useEffect(() => {
        fetchBuild();
    }, []);

    const fetchBuild = async () => {
        try {
            const response = await api.get('/admin/build', getAuthHeaders());
            setBuild(response.data);
            setBuildForm({
                curseForgeUrl: response.data.curseForgeUrl || '',
                modrinthUrl: response.data.modrinthUrl || '',
                description: response.data.description || '',
                version: response.data.version || '',
                minecraftVersion: response.data.minecraftVersion || '',
                forgeVersion: response.data.forgeVersion || ''
            });
        } catch (error) {
            showMessage('Ошибка загрузки', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const updateBuild = async () => {
        try {
            await api.put('/admin/build', buildForm, getAuthHeaders());
            showMessage('Настройки сборки сохранены', 'success');
            fetchBuild();
        } catch (error) {
            showMessage('Ошибка сохранения', 'error');
        }
    };

    const addMod = async () => {
        if (!formData.name) {
            showMessage('Введите название мода', 'error');
            return;
        }

        try {
            await api.post('/admin/build/mods', formData, getAuthHeaders());
            showMessage('Мод добавлен', 'success');
            setIsAddingMod(false);
            setFormData({ name: '', description: '', curseForgeUrl: '', modrinthUrl: '', icon: '📦', required: false });
            fetchBuild();
        } catch (error) {
            showMessage('Ошибка добавления', 'error');
        }
    };

    const updateMod = async () => {
        try {
            await api.put(`/admin/build/mods/${editingMod.id}`, formData, getAuthHeaders());
            showMessage('Мод обновлён', 'success');
            setEditingMod(null);
            fetchBuild();
        } catch (error) {
            showMessage('Ошибка обновления', 'error');
        }
    };

    const deleteMod = async (id) => {
        if (window.confirm('Удалить этот мод?')) {
            try {
                await api.delete(`/admin/build/mods/${id}`, getAuthHeaders());
                showMessage('Мод удалён', 'success');
                fetchBuild();
            } catch (error) {
                showMessage('Ошибка удаления', 'error');
            }
        }
    };

    if (loading) return <div className="build-editor-loading">Загрузка...</div>;

    return (
        <div className="build-editor-modal">
            <div className="build-editor-content">
                <div className="build-editor-header">
                    <h2>📦 Редактор сборки</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {message.text && <div className={`build-message ${message.type}`}>{message.text}</div>}

                <div className="build-editor-sections">
                    {/* Основные настройки */}
                    <div className="editor-section">
                        <h3>Основные настройки сборки</h3>
                        <div className="editor-fields">
                            <input
                                type="text"
                                placeholder="CurseForge URL"
                                value={buildForm.curseForgeUrl}
                                onChange={(e) => setBuildForm({ ...buildForm, curseForgeUrl: e.target.value })}
                                className="editor-input"
                            />
                            <input
                                type="text"
                                placeholder="Modrinth URL"
                                value={buildForm.modrinthUrl}
                                onChange={(e) => setBuildForm({ ...buildForm, modrinthUrl: e.target.value })}
                                className="editor-input"
                            />
                            <textarea
                                placeholder="Описание сборки"
                                value={buildForm.description}
                                onChange={(e) => setBuildForm({ ...buildForm, description: e.target.value })}
                                className="editor-textarea"
                                rows="3"
                            />
                            <div className="editor-row">
                                <input
                                    type="text"
                                    placeholder="Версия сборки"
                                    value={buildForm.version}
                                    onChange={(e) => setBuildForm({ ...buildForm, version: e.target.value })}
                                    className="editor-input-half"
                                />
                                <input
                                    type="text"
                                    placeholder="Версия Minecraft"
                                    value={buildForm.minecraftVersion}
                                    onChange={(e) => setBuildForm({ ...buildForm, minecraftVersion: e.target.value })}
                                    className="editor-input-half"
                                />
                                <input
                                    type="text"
                                    placeholder="Версия Forge"
                                    value={buildForm.forgeVersion}
                                    onChange={(e) => setBuildForm({ ...buildForm, forgeVersion: e.target.value })}
                                    className="editor-input-half"
                                />
                            </div>
                            <button onClick={updateBuild} className="save-build-btn">💾 Сохранить настройки</button>
                        </div>
                    </div>

                    {/* Список модов */}
                    <div className="editor-section">
                        <div className="section-header">
                            <h3>📋 Список модов</h3>
                            <button onClick={() => setIsAddingMod(true)} className="add-mod-btn">➕ Добавить мод</button>
                        </div>

                        <div className="mods-editor-list">
                            {build?.mods?.map((mod) => (
                                <div key={mod.id} className="mod-editor-card">
                                    {editingMod?.id === mod.id ? (
                                        <div className="editor-form">
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Название"
                                                className="editor-input"
                                            />
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Описание"
                                                className="editor-textarea"
                                                rows="2"
                                            />
                                            <input
                                                type="text"
                                                value={formData.curseForgeUrl}
                                                onChange={(e) => setFormData({ ...formData, curseForgeUrl: e.target.value })}
                                                placeholder="CurseForge URL"
                                                className="editor-input"
                                            />
                                            <input
                                                type="text"
                                                value={formData.modrinthUrl}
                                                onChange={(e) => setFormData({ ...formData, modrinthUrl: e.target.value })}
                                                placeholder="Modrinth URL"
                                                className="editor-input"
                                            />
                                            <div className="editor-row">
                                                <input
                                                    type="text"
                                                    value={formData.icon}
                                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                                    placeholder="Иконка (эмодзи)"
                                                    className="editor-input-small"
                                                    maxLength="2"
                                                />
                                                <label className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.required}
                                                        onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                                                    />
                                                    Обязательный мод
                                                </label>
                                            </div>
                                            <div className="editor-actions">
                                                <button onClick={updateMod} className="save-btn">💾 Сохранить</button>
                                                <button onClick={() => setEditingMod(null)} className="cancel-btn">❌ Отмена</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mod-editor-header">
                                                <div className="mod-editor-title">
                                                    <span className="mod-icon">{mod.icon || '📦'}</span>
                                                    <strong>{mod.name}</strong>
                                                    {mod.required && <span className="required-badge">Обязательный</span>}
                                                </div>
                                                <div className="mod-editor-buttons">
                                                    <button onClick={() => {
                                                        setEditingMod(mod);
                                                        setFormData({
                                                            name: mod.name,
                                                            description: mod.description || '',
                                                            curseForgeUrl: mod.curseForgeUrl || '',
                                                            modrinthUrl: mod.modrinthUrl || '',
                                                            icon: mod.icon || '📦',
                                                            required: mod.required || false
                                                        });
                                                    }} className="edit-mod-btn">✏️</button>
                                                    <button onClick={() => deleteMod(mod.id)} className="delete-mod-btn">🗑️</button>
                                                </div>
                                            </div>
                                            <div className="mod-editor-description">{mod.description}</div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {isAddingMod && (
                    <div className="mod-add-form">
                        <h3>➕ Новый мод</h3>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Название мода"
                            className="editor-input"
                        />
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Описание"
                            className="editor-textarea"
                            rows="2"
                        />
                        <input
                            type="text"
                            value={formData.curseForgeUrl}
                            onChange={(e) => setFormData({ ...formData, curseForgeUrl: e.target.value })}
                            placeholder="CurseForge URL"
                            className="editor-input"
                        />
                        <input
                            type="text"
                            value={formData.modrinthUrl}
                            onChange={(e) => setFormData({ ...formData, modrinthUrl: e.target.value })}
                            placeholder="Modrinth URL"
                            className="editor-input"
                        />
                        <div className="editor-row">
                            <input
                                type="text"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                placeholder="Иконка (эмодзи)"
                                className="editor-input-small"
                                maxLength="2"
                            />
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.required}
                                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                                />
                                Обязательный мод
                            </label>
                        </div>
                        <div className="editor-actions">
                            <button onClick={addMod} className="save-btn">✅ Добавить</button>
                            <button onClick={() => setIsAddingMod(false)} className="cancel-btn">❌ Отмена</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BuildEditor;