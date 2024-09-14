import { ZoomBlock } from './ZoomBlock.js';

const mockChrome = {
  action: {
    onClicked: { addListener: jest.fn() },
    setIcon: jest.fn(),
    setPopup: jest.fn(),
  },
  runtime: {
    getURL: jest.fn(),
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
  },
  storage: { local: { get: jest.fn(), remove: jest.fn(), set: jest.fn() } },
  tabs: {
    onRemoved: { addListener: jest.fn() },
    onUpdated: { addListener: jest.fn() },
    query: jest.fn(),
    setZoomSettings: jest.fn(),
  },
} as unknown as typeof chrome;

describe('Zoom Block', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('instantiates', () => {
    const mockZoomBlock = new ZoomBlock(mockChrome);
    expect(mockZoomBlock).toBeInstanceOf(ZoomBlock);
  });
});
