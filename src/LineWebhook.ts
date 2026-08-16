function processWebhookEvent(event: {
  type: string;
  replyToken?: string;
  source: { userId: string; type: string };
  message?: { type: string; text: string };
  postback?: { data: string };
}): void {
  const { type, replyToken, source } = event;

  // ユーザーIDを自動保存（プッシュ通知に使用）
  if (source?.userId) {
    PropertiesService.getScriptProperties().setProperty('LINE_USER_ID', source.userId);
  }

  if (type === 'follow') {
    if (!replyToken) return;
    replyMessage(replyToken, [
      createTextMessage(
        '勤怠管理ボットへようこそ！\n\n下のメニューから操作を選択してください。\n\n・基本設定\n・勤怠入力\n・勤怠修正\n・勤怠表の出力'
      ),
    ]);
    return;
  }

  if (type === 'message' && event.message?.type === 'text') {
    if (!replyToken) return;
    const text = event.message.text.trim();

    const menuMap: Record<string, [string, string, string]> = {
      基本設定:     ['基本設定を開きます', '基本設定を開く', 'settings'],
      勤怠入力:     ['勤怠入力を開きます', '勤怠入力を開く', 'input'],
      勤怠修正:     ['勤怠修正を開きます', '勤怠を修正する', 'input'],
      '勤怠表の出力': ['勤怠表を出力します', '勤怠表を出力する', 'output'],
    };

    const found = menuMap[text];
    if (found) {
      replyMessage(replyToken, [createLiffButtonMessage(found[0], found[1], found[2])]);
    } else {
      replyMessage(replyToken, [
        createTextMessage(
          '以下のキーワードを送信するか、メニューから操作を選択してください。\n\n「基本設定」\n「勤怠入力」\n「勤怠修正」\n「勤怠表の出力」'
        ),
      ]);
    }
  }
}
