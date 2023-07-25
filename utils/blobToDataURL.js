/** @type {import('vite').Plugin} */
import { lookup } from 'mime-types';
import fs from 'fs';

export const dataURLLoader = {
  name: 'dataurl-loader',
  async transform(code, id) {
    const [path, query] = id.split('?');
    if (query != 'dataurl')
      return null;
    const mime = lookup(path)
    const data = fs.readFileSync(path);
    const base64 = data.toString('base64');

    return `export default 'data:${mime};base64,${base64}';`;
  }
};