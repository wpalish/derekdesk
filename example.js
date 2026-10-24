import {KnowledgeDesk} from './src/knowledge.js';
const desk = new KnowledgeDesk();
const now = '2026-10-24T12:00:00.000Z';
// Fictional demonstration. This is not any real company's policy.
const article = desk.createArticle({
  audience: 'public',
  ru: {title: 'Пробное занятие', answer: 'В учебном примере пробное занятие назначается администратором после выбора времени.', aliases: ['пробное занятие', 'пробный урок']},
  kk: {title: 'Сынақ сабағы', answer: 'Оқу мысалында сынақ сабағын уақыт таңдалғаннан кейін әкімші тағайындайды.', aliases: ['сынақ сабағы', 'сынақ сабағына']},
  source: {title: 'Вымышленный учебный регламент', url: 'https://example.org/demo-policy', excerpt: 'Это синтетический материал: администратор подтверждает время пробного занятия.', verifiedAt: now, validUntil: '2026-11-24T12:00:00.000Z'}
}, 'demo-owner', now);
desk.approveArticle(article.id, 'demo-owner', now);
for (const [locale, question] of [['ru','Как проходит пробное занятие?'],['kk','Сынақ сабағына қалай жазылуға болады?']]) {
  const result = desk.ask({question, locale}, now);
  console.log(JSON.stringify({locale, status: result.status, answer: result.answer?.text, source: result.answer?.source.title}, null, 2));
}
const unknown = desk.ask({question: 'Как вернуть оплату?', locale: 'ru'}, now);
console.log(JSON.stringify({status: unknown.status, reason: unknown.handoffReason, queued: desk.listOpenCases().length}, null, 2));
desk.close();
