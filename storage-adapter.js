/*
 * 메모 저장소 어댑터
 * ------------------------------------------------------------
 * 지금은 브라우저 로컬 저장(localStorage)을 사용합니다.
 * 나중에 Supabase를 연동할 때는 이 파일만 아래 형태로 교체하면 됩니다.
 * (index.html이나 app.js는 건드릴 필요 없음 — 항상 window.NoteStorage를 통해서만 접근하기 때문)
 *
 * 예시 (Supabase로 교체 시):
 *
 *   const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 *   window.NoteStorage = {
 *     async getNote(reagentId) {
 *       const { data } = await supabase.from('notes').select('content').eq('reagent_id', reagentId).single();
 *       return data ? data.content : '';
 *     },
 *     async setNote(reagentId, text) {
 *       await supabase.from('notes').upsert({ reagent_id: reagentId, content: text, updated_at: new Date() });
 *     },
 *   };
 *
 * 권장 Supabase 테이블 스키마:
 *   create table notes (
 *     reagent_id text primary key,
 *     content text,
 *     updated_at timestamptz default now()
 *   );
 */

(function () {
  const PREFIX = 'reagent-note:';

  // Claude.ai 아티팩트 미리보기 환경에서는 window.storage(영구 저장 API)가 있으면 그걸 우선 사용하고,
  // 실제 배포(깃허브 등) 환경에서는 localStorage로 자동 폴백합니다.
  const hasClaudeStorage = typeof window !== 'undefined' && !!window.storage;

  window.NoteStorage = {
    async getNote(reagentId) {
      if (hasClaudeStorage) {
        try {
          const res = await window.storage.get(PREFIX + reagentId);
          return res ? res.value : '';
        } catch (e) {
          // 키가 없으면 에러를 던지는 구현도 있어 안전하게 빈 문자열 처리
          return '';
        }
      }
      try {
        return localStorage.getItem(PREFIX + reagentId) || '';
      } catch (e) {
        return '';
      }
    },

    async setNote(reagentId, text) {
      if (hasClaudeStorage) {
        try {
          await window.storage.set(PREFIX + reagentId, text);
          return true;
        } catch (e) {
          return false;
        }
      }
      try {
        localStorage.setItem(PREFIX + reagentId, text);
        return true;
      } catch (e) {
        return false;
      }
    },

    async hasNote(reagentId) {
      const note = await this.getNote(reagentId);
      return !!(note && note.trim());
    },
  };
})();
