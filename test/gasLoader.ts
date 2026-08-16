// GAS の .ts ファイル（export なしのグローバルスコープ前提）を
// 本番コードに一切手を加えずテストから呼び出すためのローダー。
// src/*.ts をサンドボックス（vm）内で実行し、トップレベルの関数を取り出す。
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vm from 'node:vm';
import * as ts from 'typescript';

const SRC_DIR = path.resolve(__dirname, '..', 'src');

// 複数ファイルを同一スコープにまとめて読み込む（GAS が全ファイルを
// 1つのグローバルスコープとして結合するのと同じ状態を再現する）
export function loadGasFiles(fileNames: string[]): Record<string, any> {
  const context = vm.createContext({ console });
  for (const fileName of fileNames) {
    const filePath = path.join(SRC_DIR, fileName);
    const source = fs.readFileSync(filePath, 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2019 },
    });
    new vm.Script(outputText, { filename: fileName }).runInContext(context);
  }
  return context as Record<string, any>;
}

export function loadGasFile(fileName: string): Record<string, any> {
  return loadGasFiles([fileName]);
}
