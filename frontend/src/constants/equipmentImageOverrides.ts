// Google Drive URLから画像表示用URLを生成
// 注意：URLは保存時にそのまま保存され、表示時のみこの関数で変換される
export const resolveEquipmentImage = (_name: string, imageUrl?: string) => {
  if (!imageUrl) return undefined;

  // 空文字列の場合
  if (imageUrl.trim() === "") return undefined;

  // すでに thumbnail 形式の場合はそのまま返す
  if (imageUrl.includes("thumbnail?id=")) {
    return imageUrl;
  }

  // Google Drive URLからファイルIDを抽出
  let fileId: string | null = null;

  // /d/FILE_ID/ 形式
  const dMatch = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch) {
    fileId = dMatch[1];
  }

  // id=FILE_ID 形式（すでに変換済みの場合）
  if (!fileId) {
    const idMatch = imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      fileId = idMatch[1];
    }
  }

  // ファイルIDのみの場合（スラッシュなし、20文字以上の英数字ハイフンアンダースコア）
  if (!fileId && imageUrl.match(/^[a-zA-Z0-9_-]{20,}$/)) {
    fileId = imageUrl;
  }

  // ファイルIDが見つかった場合、サムネイルURLを返す
  if (fileId) {
    // lh3.googleusercontent.com 経由のサムネイルを使用
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }

  // その他のURL（Firebase Storage等）はそのまま返す
  return imageUrl;
};
