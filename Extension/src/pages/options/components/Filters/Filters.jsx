import React, { useContext, useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { observer } from 'mobx-react';
import sortBy from 'lodash/sortBy';
import { Group } from './Group';
import { Filter } from './Filter';
import { EmptyCustom } from './EmptyCustom';
import { Search } from './Search';
import { FiltersUpdate } from './FiltersUpdate';
import { rootStore } from '../../stores/RootStore';
import { reactTranslator } from '../../../reactCommon/reactTranslator';
import { AddCustomModal } from './AddCustomModal';
import { CUSTOM_FILTERS_GROUP_ID } from '../../../../../../tools/constants';

const Filters = observer(() => {
    const SEARCH_FILTERS = {
        ALL: 'all',
        ENABLED: 'enabled',
        DISABLED: 'disabled',
    };

    const history = useHistory();
    const { id, url, title } = useParams();

    const [searchInput, setSearchInput] = useState('');
    const [searchSelect, setSearchSelect] = useState(SEARCH_FILTERS.ALL);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [urlToSubscribe, setUrlToSubscribe] = useState(decodeURIComponent(url || ''));
    const [customFilterTitle, setCustomFilterTitle] = useState(title);

    const { settingsStore, uiStore } = useContext(rootStore);

    const {
        categories,
        filters,
        rulesCount,
        lastUpdateTime,
        filtersUpdating,
    } = settingsStore;

    settingsStore.setSelectedGroupId(parseInt(id, 10));

    const handleGroupSwitch = async ({ id, data }) => {
        await settingsStore.updateGroupSetting(id, data);
    };

    const groupClickHandler = (groupId) => () => {
        settingsStore.setSelectedGroupId(groupId);
        history.push(`/filters${groupId}`);
    };

    const getEnabledFiltersByGroup = (group) => (
        filters.filter((filter) => filter.groupId === group.groupId && filter.enabled)
    );

    const renderGroups = (groups) => {
        const sortedGroups = sortBy(groups, 'displayNumber');
        return sortedGroups.map((group) => {
            const enabledFilters = getEnabledFiltersByGroup(group);
            return (
                <Group
                    key={group.groupId}
                    groupName={group.groupName}
                    groupId={group.groupId}
                    enabledFilters={enabledFilters}
                    groupClickHandler={groupClickHandler(group.groupId)}
                    checkboxHandler={handleGroupSwitch}
                    checkboxValue={!!group.enabled}
                />
            );
        });
    };

    const handleFilterSwitch = async ({ id, data }) => {
        await settingsStore.updateFilterSetting(id, data);
    };

    const renderFilters = (filtersList) => {
        return filtersList.map((filter) => (
            <Filter
                key={filter.filterId}
                filter={filter}
                tags={filter.tagsDetails}
                checkboxHandler={handleFilterSwitch}
                checkboxValue={!!filter.enabled}
            />
        ));
    };

    const handleReturnToGroups = () => {
        history.push('/filters');
        settingsStore.setSelectedGroupId(null);
    };

    const searchInputHandler = (e) => {
        const { value } = e.target;
        setSearchInput(value);
    };

    const searchCloseHandler = () => {
        setSearchInput('');
        setSearchSelect(SEARCH_FILTERS.ALL);
    };

    const searchSelectHandler = (e) => {
        const { value } = e.target;
        setSearchSelect(value);
    };

    const renderSearchResult = () => {
        const searchInputString = searchInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchQuery = new RegExp(searchInputString, 'ig');

        let searchFilters = filters;
        if (Number.isInteger(settingsStore.selectedGroupId)) {
            searchFilters = filters.filter((filter) => (
                filter.groupId === settingsStore.selectedGroupId
            ));
        }

        return searchFilters.map((filter) => {
            let searchMod;
            switch (searchSelect) {
                case SEARCH_FILTERS.ENABLED:
                    searchMod = filter.enabled;
                    break;
                case SEARCH_FILTERS.DISABLED:
                    searchMod = !filter.enabled;
                    break;
                default:
                    searchMod = true;
            }

            if (filter.name.match(searchQuery) && searchMod) {
                return (
                    <Filter
                        key={filter.filterId}
                        filter={filter}
                        tags={filter.tagsDetails}
                        checkboxHandler={handleFilterSwitch}
                        checkboxValue={!!filter.enabled}
                    />
                );
            }
            return null;
        });
    };

    const updateFiltersHandler = async () => {
        try {
            const updates = await settingsStore.updateFilters();
            const filterNames = updates.map((filter) => filter.name).join(', ');
            let description;
            if (updates.length === 0) {
                description = `${filterNames} ${reactTranslator.translate('options_popup_update_not_found')}`;
            } else if (updates.length === 1) {
                description = `${filterNames} ${reactTranslator.translate('options_popup_update_filter')}`;
            } else if (updates.length > 1) {
                description = `${filterNames} ${reactTranslator.translate('options_popup_update_filters')}`;
            }
            uiStore.addNotification({ description });
        } catch (error) {
            uiStore.addNotification({
                title: reactTranslator.translate('options_popup_update_title_error'),
                description: reactTranslator.translate('options_popup_update_error'),
            });
        }
    };

    const renderSearch = () => (
        <Search
            searchInputHandler={searchInputHandler}
            searchSelectHandler={searchSelectHandler}
            searchInput={searchInput}
            searchSelect={searchSelect}
            searchCloseHandler={searchCloseHandler}
        />
    );

    const renderFiltersUpdate = () => {
        const buttonClass = filtersUpdating ? 'loading' : 'loaded';
        return (
            <FiltersUpdate
                handler={updateFiltersHandler}
                rulesCount={rulesCount}
                buttonClass={buttonClass}
                lastUpdateDate={lastUpdateTime}
            />
        );
    };

    const openModalHandler = () => {
        setModalIsOpen(true);
    };

    const closeModalHandler = () => {
        setModalIsOpen(false);
    };

    useEffect(() => {
        if (urlToSubscribe) {
            openModalHandler();
        }
    });

    const renderModal = () => {
        return (
            modalIsOpen && (
                <AddCustomModal
                    closeModalHandler={closeModalHandler}
                    modalIsOpen={modalIsOpen}
                    initialUrl={urlToSubscribe}
                    initialTitle={customFilterTitle}
                />
            )
        );
    };

    useEffect(() => {
        if (modalIsOpen) {
            setUrlToSubscribe('');
            setCustomFilterTitle('');
        }
    });

    const renderAddFilterBtn = () => {
        if (settingsStore.selectedGroupId === CUSTOM_FILTERS_GROUP_ID) {
            return (
                <div>
                    <button
                        type="button"
                        onClick={openModalHandler}
                        className="button button--add-custom-filter button--m button--green"
                    >
                        {reactTranslator.translate('options_add_custom_filter')}
                    </button>
                </div>
            );
        }
    };

    // search by input data or by enabled/disabled filters
    const isSearching = searchInput || searchSelect !== SEARCH_FILTERS.ALL;

    if (Number.isInteger(settingsStore.selectedGroupId)) {
        const groupFilters = filters.filter((filter) => filter.groupId === settingsStore.selectedGroupId);
        const { groupName } = categories.find((group) => group.groupId === settingsStore.selectedGroupId);
        if (settingsStore.selectedGroupId === CUSTOM_FILTERS_GROUP_ID && groupFilters.length === 0) {
            return (
                <>
                    <div className="title-btn">
                        <button
                            type="button"
                            className="button button--back"
                            onClick={handleReturnToGroups}
                        />
                        <h2 className="title title--back-btn">{groupName}</h2>
                    </div>
                    <EmptyCustom />
                    {renderModal()}
                </>
            );
        }
        return (
            <>
                <div className="title-btn">
                    <button
                        type="button"
                        className="button button--back"
                        onClick={handleReturnToGroups}
                    />
                    <h2 className="title title--back-btn">{groupName}</h2>
                </div>
                {renderSearch()}
                <div>
                    {
                        isSearching
                            ? renderSearchResult()
                            : filters && renderFilters(groupFilters)
                    }
                </div>
                {renderAddFilterBtn()}
                {renderModal()}
            </>
        );
    }
    return (
        <>
            <div className="title-btn">
                {renderFiltersUpdate()}
                <h2 className="title title--filters-up">{reactTranslator.translate('options_antibanner')}</h2>
            </div>
            {renderSearch()}
            {
                isSearching
                    ? renderSearchResult()
                    : categories && renderGroups(categories)
            }
        </>
    );
});

export { Filters };