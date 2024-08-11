/*

  Zoom Block - A browser extension that disables zooming.
  Copyright (C) 2024 Wesley Warnell
  https://github.com/warnellw/Zoom-Block

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

type ChromeType = typeof chrome;

class ZoomBlock {
  private browser: ChromeType;
  private popup: string;
  private images: Map<string, Record<string, string>>;

  constructor(api: ChromeType) {
    this.browser = api;

    this.popup = this.browser.runtime.getURL('assets/popup.html');

    this.images = new Map()
      .set('red', {
        16: this.browser.runtime.getURL('assets/icons/red16.png'),
        24: this.browser.runtime.getURL('assets/icons/red24.png'),
        32: this.browser.runtime.getURL('assets/icons/red32.png'),
      })
      .set('green', {
        16: this.browser.runtime.getURL('assets/icons/green16.png'),
        24: this.browser.runtime.getURL('assets/icons/green24.png'),
        32: this.browser.runtime.getURL('assets/icons/green32.png'),
      })
      .set('gray', {
        16: this.browser.runtime.getURL('assets/icons/gray16.png'),
        24: this.browser.runtime.getURL('assets/icons/gray24.png'),
        32: this.browser.runtime.getURL('assets/icons/gray32.png'),
      });
  }

  addListeners() {
    this.browser.action.onClicked.addListener(
      async (tab) => await this.iconClick(tab),
    );
    this.browser.runtime.onInstalled.addListener(async () => await this.init());
    this.browser.runtime.onStartup.addListener(async () => await this.init());
    this.browser.tabs.onRemoved.addListener(
      async (tabId) => await this.removeEnabled(tabId),
    );
    this.browser.tabs.onUpdated.addListener(
      async (tabId, changeInfo) =>
        await this.tabUpdated(tabId, changeInfo.status),
    );
  }

  async getEnabled(tabId: number) {
    const key = String(tabId);
    const obj = await this.browser.storage.local.get(key);
    return !!obj[key];
  }

  async setEnabled(tabId: number) {
    return await this.browser.storage.local.set({ [String(tabId)]: true });
  }

  async removeEnabled(tabId: number) {
    return await this.browser.storage.local.remove(String(tabId));
  }

  async setPopup(tabId: number, hasError: boolean) {
    return await this.browser.action.setPopup({
      tabId,
      popup: hasError ? this.popup : '',
    });
  }

  zoomConstructor(mode: boolean): chrome.tabs.ZoomSettings {
    return {
      mode: mode === false ? 'disabled' : 'automatic',
      scope: 'per-tab',
    };
  }

  async init() {
    const tabs = await this.browser.tabs.query({});
    const allStorage = await this.browser.storage.local.get();
    for (const previouslyEnabledTabId of Object.keys(allStorage)) {
      if (!tabs.find((tab) => tab.id! === Number(previouslyEnabledTabId))) {
        this.removeEnabled(Number(previouslyEnabledTabId));
      }
    }
    for (const tab of tabs) {
      await this.store(tab);
    }
  }

  async store(tab: chrome.tabs.Tab) {
    try {
      const isEnabled = await this.getEnabled(tab.id!);
      await this.setZoomSettings(tab.id!, isEnabled);
      await this.updateIcon(tab.id!, isEnabled);
    } catch {
      await this.updateIcon(tab.id!);
    }
  }

  async updateIcon(tabId: number, enabled?: boolean) {
    const path = this.images.get(
      enabled === false ? 'red' : enabled === true ? 'green' : 'gray',
    )!;
    await this.browser.action.setIcon({
      path,
      tabId,
    });
  }

  async setZoomSettings(tabId: number, zoomSetting: boolean) {
    try {
      await this.browser.tabs.setZoomSettings(
        tabId,
        this.zoomConstructor(zoomSetting),
      );
    } catch (err) {
      await this.setPopup(tabId, true);
      throw err;
    }
  }

  async iconClick(tab: chrome.tabs.Tab) {
    const tabId = tab.id!;
    const isEnabled = await this.getEnabled(tabId);
    try {
      await this.setZoomSettings(tabId, !isEnabled);
      if (!isEnabled) {
        await this.setEnabled(tabId);
      } else {
        await this.removeEnabled(tabId);
      }
      await this.updateIcon(tabId, !isEnabled);
    } catch {
      await this.updateIcon(tabId, undefined);
    }
  }

  async tabUpdated(tabId: number, changeInfo?: chrome.tabs.TabStatus) {
    if (changeInfo !== 'loading') return;
    const isEnabled = await this.getEnabled(tabId);
    try {
      await this.setZoomSettings(tabId, isEnabled);
      await this.updateIcon(tabId, isEnabled);
    } catch {
      // https://bugs.chromium.org/p/chromium/issues/detail?id=30113
      await this.updateIcon(tabId, undefined);
    }
  }
}

new ZoomBlock(chrome).addListeners();
