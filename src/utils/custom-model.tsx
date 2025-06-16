import { MAX_GGUF_SIZE } from '../config';
import { DisplayedModel } from './displayed-model';
import { WllamaStorage } from './llama_utils';

//specific sequence of bytes that identifies a file as being in the GGUF format
const ggufMagicNumber = new Uint8Array([0x47, 0x47, 0x55, 0x46]);

export async function verifyCustomModel(url: string): Promise<DisplayedModel> {
  const _url = url.replace(/\?.*/, '');

  const response = await fetch(_url, {

    // headers: extra instructions or metadata that we send along with our request to the server. 
    // They give the server more context about what we want.
    headers: {
      Range: `bytes=0-${2 * 1024 * 1024}`,
    },
  });

  // arrayBuffer() : chunk of generic memory. It can store anything, a text, image data, or numbers anything. 
  if (response.ok)
  {

    // the data we received in response we are just storing in form of raw block of memory in a variable called buf (an arrayBuffer())
    const buf = await response.arrayBuffer();

    // we first slice the first 4 bytes of buff and thenconvert the buff to an
    // array of 8-bit unsigned integers (Uint8Array)
    if (!checkBuffer(new Uint8Array(buf.slice(0, 4)), ggufMagicNumber)) 
    {
      throw new Error( 'Not a valid gguf file: not starting with GGUF magic number' );
    }
  } else {
    throw new Error(`Fetch error with status code = ${response.status}`);
  }

  return new DisplayedModel(_url, await getModelSize(_url), true, undefined);
}

const checkBuffer = (buffer: Uint8Array, header: Uint8Array) => {
  for (let i = 0; i < header.length; i++) {
    if (header[i] !== buffer[i]) {
      return false;
    }
  }
  return true;
};

const getModelSize = async (url: string): Promise<number> => {
  const urls = parseModelUrl(url); // returns list of all 

  // by Promise.all we basically say i am giving all my tasks, return me a promise when each completes......
  const sizes = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, {
        method: 'HEAD',
      });

      if (response.ok) {
        const contentLength = response.headers.get('Content-Length');
        if (contentLength) {
          return parseInt(contentLength);
        } else {
          return 0;
        }
      } else {
        throw new Error(`Fetch error with status code = ${response.status}`);
      }
    })
  );

  if (sizes.some((s) => s >= MAX_GGUF_SIZE)) {
    throw new Error(
      'GGUF file is too big (max. 2GB per file). Please split the file into smaller shards (learn more in "Guide")'
    );
  }

  return sumArr(sizes);
};

// Address Decoder
const parseModelUrl = (modelUrl: string): string[] => {
  const urlPartsRegex =
    /(?<baseURL>.*)-(?<current>\d{5})-of-(?<total>\d{5})\.gguf$/;

  const matches = modelUrl.match(urlPartsRegex);
  if (!matches || !matches.groups || Object.keys(matches.groups).length !== 3) {
    return [modelUrl];
  }

  const { baseURL, total } = matches.groups; 

  const paddedShardIds = Array.from({ length: Number(total) }, (_, index) =>
    (index + 1).toString().padStart(5, '0')
  );

  return paddedShardIds.map(
    (current) => `${baseURL}-${current}-of-${total}.gguf`
  );
};

const sumArr = (arr: number[]) => arr.reduce((sum, num) => sum + num, 0);

// for debugging only
// @ts-ignore
window._exportModelList = function () {
  const list: any[] = WllamaStorage.load('custom_models', []);
  const listExported = list.map((m) => {
    delete m.userAdded;  // in the list for each model we remove userAdded property
    return m;
  });

  console.log(JSON.stringify(listExported, null, 2)); // convert js object to json string and print on console.
};