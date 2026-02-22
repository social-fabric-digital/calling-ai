import { PaperTextureBackground } from '@/components/PaperTextureBackground';
import { BodyStyle, HeadingStyle } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const isRussian = i18n.language?.toLowerCase().startsWith('ru');

  return (
    <PaperTextureBackground>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#342846" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isRussian ? 'Политика конфиденциальности' : 'Privacy Policy'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>Calling AI</Text>
        <Text style={styles.updated}>
          {isRussian ? 'Последнее обновление: 15 февраля 2026 г.' : 'Last Updated: February 15, 2026'}
        </Text>

        {isRussian ? (
          <>
            <Section title="ВВЕДЕНИЕ">
              <Text style={styles.body}>
                Добро пожаловать в Calling AI («мы», «наш» или «нас»). Мы стремимся защищать вашу конфиденциальность и персональные данные. Эта политика конфиденциальности объясняет, как мы собираем, используем, раскрываем и защищаем информацию при использовании мобильного приложения Calling AI («Приложение»).
              </Text>
              <Text style={styles.body}>
                Пожалуйста, внимательно прочитайте эту политику конфиденциальности. Получая доступ к Приложению или используя его, вы подтверждаете, что прочитали, поняли и принимаете её условия. Если вы не согласны с этими условиями, пожалуйста, не используйте Приложение.
              </Text>
              <Text style={styles.body}>
                Мы можем вносить изменения в политику конфиденциальности в любое время. Обновления отражаются в дате «Последнее обновление». О существенных изменениях мы сообщаем через уведомления в приложении или по электронной почте.
              </Text>
            </Section>

            <Section title="2. ИНФОРМАЦИЯ, КОТОРУЮ МЫ СОБИРАЕМ">
              <Text style={styles.subheading}>2.1 ЛИЧНАЯ ИНФОРМАЦИЯ, КОТОРУЮ ВЫ ПРЕДОСТАВЛЯЕТЕ</Text>
              <Text style={styles.bullet}>Адрес электронной почты: создание учётной записи, аутентификация и связь.</Text>
              <Text style={styles.bullet}>Имя: персонализация пользовательского опыта.</Text>
              <Text style={styles.bullet}>Дата, время и место рождения: астрологические расчёты и персонализированные прогнозы.</Text>
              <Text style={styles.bullet}>Цели, стремления и личные размышления: работа функций карты ясности, дневника и AI-коучинга.</Text>
              <Text style={styles.bullet}>Переписки в чате: взаимодействие с AI-коучем Atlas.</Text>

              <Text style={styles.subheading}>2.2 ИНФОРМАЦИЯ, СОБИРАЕМАЯ АВТОМАТИЧЕСКИ</Text>
              <Text style={styles.bullet}>Информация об устройстве: тип устройства, операционная система и идентификаторы устройства.</Text>
              <Text style={styles.bullet}>Данные об использовании: используемые функции, время в приложении и модели взаимодействия.</Text>
              <Text style={styles.bullet}>Данные журнала: время доступа, просмотренные страницы, сбои приложения и системная активность.</Text>
              <Text style={styles.bullet}>Данные о местоположении: общее местоположение по IP-адресу без точного GPS.</Text>

            </Section>

            <Section title="3. КАК МЫ ИСПОЛЬЗУЕМ ВАШУ ИНФОРМАЦИЮ">
              <Text style={styles.subheading}>3.1 ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ</Text>
              <Text style={styles.bullet}>Создание персонализированных астрологических прогнозов на основе данных о рождении.</Text>
              <Text style={styles.bullet}>Предоставление AI-коучинга через Atlas.</Text>
              <Text style={styles.bullet}>Отслеживание и управление целями и этапами.</Text>
              <Text style={styles.bullet}>Доставка ежедневных персонализированных космических прогнозов.</Text>
              <Text style={styles.bullet}>Работа функций карты ясности и рефлексии.</Text>
            </Section>

            <Section title="4. КАК МЫ ПЕРЕДАЁМ ВАШУ ИНФОРМАЦИЮ">
              <Text style={styles.body}>
                Мы не продаём, не обмениваем и не сдаём в аренду вашу личную информацию третьим лицам.
              </Text>
            </Section>

            <Section title="5. ХРАНЕНИЕ И БЕЗОПАСНОСТЬ ДАННЫХ">
              <Text style={styles.bullet}>Шифрование данных при передаче (TLS/SSL).</Text>
              <Text style={styles.bullet}>Шифрование конфиденциальных данных при хранении.</Text>
              <Text style={styles.bullet}>Безопасные механизмы аутентификации и контроль доступа.</Text>
              <Text style={styles.bullet}>Регулярные оценки безопасности и проверка кода.</Text>
              <Text style={styles.body}>
                После удаления учётной записи мы удалим ваши личные данные в течение 30 дней, за исключением данных, которые требуется хранить по закону.
              </Text>
            </Section>

            <Section title="6. ВАШИ ПРАВА И ВЫБОР">
              <Text style={styles.bullet}>Доступ к данным и переносимость.</Text>
              <Text style={styles.bullet}>Исправление неточных данных.</Text>
              <Text style={styles.bullet}>Удаление данных.</Text>
              <Text style={styles.bullet}>Управление уведомлениями и отказ от рассылок.</Text>
            </Section>

            <Section title="7. ВОЗРАСТНЫЕ ОГРАНИЧЕНИЯ">
              <Text style={styles.body}>
                Приложение предназначено для пользователей от 16 лет и старше. Если мы установим, что пользователю меньше 16 лет, мы незамедлительно удалим его учётную запись и связанные данные.
              </Text>
            </Section>

            <Section title="8. МЕЖДУНАРОДНАЯ ПЕРЕДАЧА ДАННЫХ">
              <Text style={styles.body}>
                Если вы используете Приложение за пределами США, ваша информация может передаваться, храниться и обрабатываться в Соединённых Штатах Америки.
              </Text>
            </Section>

            <Section title="9. ССЫЛКИ И СЕРВИСЫ ТРЕТЬИХ ЛИЦ">
              <Text style={styles.body}>
                Мы не несём ответственности за политику конфиденциальности сторонних сервисов. Пожалуйста, ознакомьтесь с их условиями до передачи личной информации.
              </Text>
            </Section>

            <Section title="10. ПРАВА НА КОНФИДЕНЦИАЛЬНОСТЬ В КАЛИФОРНИИ (CCPA)">
              <Text style={styles.bullet}>Право знать, какие категории и какие конкретные данные о вас были собраны.</Text>
              <Text style={styles.bullet}>Право на удаление персональных данных с учётом предусмотренных законом исключений.</Text>
              <Text style={styles.bullet}>Право на отказ от «продажи» персональных данных. Мы не продаём ваши данные.</Text>
              <Text style={styles.bullet}>Право на недискриминацию при реализации прав на конфиденциальность.</Text>
            </Section>

            <Section title="11. ЕВРОПЕЙСКИЕ ПРАВА НА КОНФИДЕНЦИАЛЬНОСТЬ (GDPR)">
              <Text style={styles.body}>
                Для запросов, связанных с GDPR, напишите на privacy@callingai.app.
              </Text>
              <Text style={styles.body}>
                Мы стараемся отвечать на такие запросы в течение 30 дней.
              </Text>
            </Section>

            <Section title="12. ИЗМЕНЕНИЯ ПОЛИТИКИ КОНФИДЕНЦИАЛЬНОСТИ">
              <Text style={styles.body}>
                Мы можем периодически обновлять эту политику конфиденциальности. О существенных изменениях мы уведомим вас заранее через приложение и/или по электронной почте.
              </Text>
            </Section>
          </>
        ) : (
          <>
            <Section title="Introduction">
              <Text style={styles.body}>
                Welcome to Calling AI ("we," "our," or "us"). We are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application Calling AI (the "App").
              </Text>
              <Text style={styles.body}>
                Please read this Privacy Policy carefully. By accessing or using the App, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with the terms of this Privacy Policy, please do not access or use the App.
              </Text>
              <Text style={styles.body}>
                We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of this Privacy Policy and, for material changes, by notifying you through in-app notices or email. You are encouraged to periodically review this Privacy Policy to stay informed of updates.
              </Text>
            </Section>

        <Section title="2. Information We Collect">
          <Text style={styles.subheading}>2.1 Personal Information You Provide</Text>
          <Text style={styles.body}>We collect information that you voluntarily provide to us when you register for an account, use the App's features, or contact us for support. This information may include:</Text>
          <Text style={styles.bullet}>- Email Address - Account creation, authentication, communication</Text>
          <Text style={styles.bullet}>- Name - Personalization of your experience</Text>
          <Text style={styles.bullet}>- Date of Birth - Astrological calculations and personalized insights</Text>
          <Text style={styles.bullet}>- Time of Birth - Accurate birth chart generation</Text>
          <Text style={styles.bullet}>- Place of Birth - Astrological calculations</Text>
          <Text style={styles.bullet}>- Goals and Aspirations - Personalized goal tracking and AI coaching</Text>
          <Text style={styles.bullet}>- Personal Reflections - Clarity Map entries and journaling features</Text>
          <Text style={styles.bullet}>- Chat Conversations - AI coaching interactions with Atlas</Text>

          <Text style={styles.subheading}>2.2 Information Collected Automatically</Text>
          <Text style={styles.body}>When you use the App, we may automatically collect certain information, including:</Text>
          <Text style={styles.bullet}>- Device Information: Device type, operating system, unique device identifiers.</Text>
          <Text style={styles.bullet}>- Usage Data: Features used, time spent in app, interaction patterns.</Text>
          <Text style={styles.bullet}>- Log Data: Access times, pages viewed, app crashes, and system activity.</Text>
          <Text style={styles.bullet}>- Location Data: General location based on IP address only. We do not collect precise GPS location.</Text>

        </Section>

        <Section title="3. How We Use Your Information">
          <Text style={styles.subheading}>3.1 Core App Functionality</Text>
          <Text style={styles.bullet}>- Generate personalized astrological insights based on your birth data.</Text>
          <Text style={styles.bullet}>- Provide AI-powered life coaching through Atlas.</Text>
          <Text style={styles.bullet}>- Track and manage your goals and milestones.</Text>
          <Text style={styles.bullet}>- Deliver daily personalized cosmic insights.</Text>
          <Text style={styles.bullet}>- Power the Clarity Map and reflection features.</Text>

          <Text style={styles.subheading}>3.2 Personalization</Text>
          <Text style={styles.bullet}>- Customize content and recommendations to your unique profile.</Text>
          <Text style={styles.bullet}>- Tailor the AI coaching experience to your needs and goals.</Text>
          <Text style={styles.bullet}>- Provide relevant notifications and reminders.</Text>

          <Text style={styles.subheading}>3.3 Communication</Text>
          <Text style={styles.bullet}>- Send you updates about your goals and progress.</Text>
          <Text style={styles.bullet}>- Deliver daily insight notifications (with your permission).</Text>
          <Text style={styles.bullet}>- Respond to your inquiries and support requests.</Text>
          <Text style={styles.bullet}>- Send important service-related announcements.</Text>

          <Text style={styles.subheading}>3.4 Improvement and Analytics</Text>
          <Text style={styles.bullet}>- Understand how users interact with the App.</Text>
          <Text style={styles.bullet}>- Identify and fix bugs and technical issues.</Text>
          <Text style={styles.bullet}>- Develop new features and improve existing ones.</Text>
          <Text style={styles.bullet}>- Conduct research and analysis to enhance user experience.</Text>

          <Text style={styles.subheading}>3.5 Legal and Safety</Text>
          <Text style={styles.bullet}>- Comply with legal obligations.</Text>
          <Text style={styles.bullet}>- Enforce our Terms of Service.</Text>
          <Text style={styles.bullet}>- Protect against fraudulent or illegal activity.</Text>
          <Text style={styles.bullet}>- Ensure the security of our services.</Text>
        </Section>

        <Section title="4. How We Share Your Information">
          <Text style={styles.body}>
            We do not sell, trade, or rent your personal information to third parties.
          </Text>
        </Section>

        <Section title="5. Data Storage and Security">
          <Text style={styles.subheading}>5.1 Where We Store Your Data</Text>
          <Text style={styles.body}>Your data is stored securely on servers provided by Supabase, located in the United States. If additional server locations are used in the future, this policy will be updated accordingly.</Text>
          <Text style={styles.subheading}>5.2 How We Protect Your Data</Text>
          <Text style={styles.bullet}>- Encryption of data in transit (TLS/SSL).</Text>
          <Text style={styles.bullet}>- Encryption of sensitive data at rest.</Text>
          <Text style={styles.bullet}>- Secure authentication mechanisms.</Text>
          <Text style={styles.bullet}>- Regular security assessments and penetration testing.</Text>
          <Text style={styles.bullet}>- Access controls limiting employee access to personal data on a need-to-know basis.</Text>
          <Text style={styles.bullet}>- Secure coding practices and code review.</Text>
          <Text style={styles.subheading}>5.3 Data Breach Notification</Text>
          <Text style={styles.body}>In the event of a data breach that affects your personal information, we will notify you via email and in-app notification within 72 hours of becoming aware of the breach. The notification will include the nature of the breach, the data affected, the steps we are taking to address it, and recommended actions you can take to protect yourself.</Text>
          <Text style={styles.subheading}>5.4 Data Retention</Text>
          <Text style={styles.body}>We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time (see "Your Rights" below).</Text>
          <Text style={styles.body}>After account deletion, we will delete your personal data within 30 days, except for the following, which we may retain for up to 7 years:</Text>
          <Text style={styles.bullet}>- Transaction records required for tax and accounting purposes.</Text>
          <Text style={styles.bullet}>- Data necessary to resolve active disputes or enforce existing agreements.</Text>
          <Text style={styles.bullet}>- Data we are legally required to retain by applicable law.</Text>
          <Text style={styles.body}>All retained data will continue to be protected in accordance with this Privacy Policy.</Text>
        </Section>

        <Section title="6. Your Rights and Choices">
          <Text style={styles.subheading}>6.1 Access and Portability</Text>
          <Text style={styles.body}>You have the right to request a copy of the personal information we hold about you in a commonly used, machine-readable format. We will respond to such requests within 30 days.</Text>
          <Text style={styles.subheading}>6.2 Correction</Text>
          <Text style={styles.body}>You have the right to request that we correct any inaccurate or incomplete personal information.</Text>
          <Text style={styles.subheading}>6.3 Deletion</Text>
          <Text style={styles.body}>You have the right to request deletion of your personal information. You can delete your account through the App's Settings screen. We will process deletion requests within 30 days.</Text>
          <Text style={styles.subheading}>6.4 Opt-Out of Communications</Text>
          <Text style={styles.body}>You can opt out of receiving promotional communications by adjusting notification settings in the App, following unsubscribe instructions in emails, or contacting us directly. Note that you may still receive essential service-related communications (for example, security alerts, policy changes).</Text>
          <Text style={styles.subheading}>6.5 Manage Notifications</Text>
          <Text style={styles.body}>You can manage push notification preferences through the App's Settings screen or your device's notification settings.</Text>
          <Text style={styles.subheading}>6.6 Do Not Track</Text>
          <Text style={styles.body}>Some browsers have a "Do Not Track" feature. Our App does not currently respond to Do Not Track signals. We will update this policy if we implement Do Not Track support in the future.</Text>
        </Section>

        <Section title="7. Age Requirement">
          <Text style={styles.body}>This App is designed for users aged 16 and older. We do not target, market to, or knowingly collect personal information from anyone under the age of 16.</Text>
          <Text style={styles.body}>Since the App collects your date of birth for astrological purposes, we use this information to verify that you meet the minimum age requirement. If we determine that a user is under 16, we will promptly delete their account and associated data.</Text>
        </Section>

        <Section title="8. International Data Transfers">
          <Text style={styles.body}>If you are accessing the App from outside the United States, please be aware that your information will be transferred to, stored, and processed in the United States.</Text>
          <Text style={styles.body}>For users in the European Economic Area (EEA), United Kingdom, or Switzerland, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission as the legal mechanism for transferring your personal data to the United States. These clauses ensure that your data receives an adequate level of protection as required by the GDPR.</Text>
          <Text style={styles.body}>By using the App, you acknowledge and consent to the transfer of your information as described in this section.</Text>
        </Section>

        <Section title="9. Third-Party Links and Services">
          <Text style={styles.body}>The App may contain links to third-party websites or services that are not operated by us. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party services you access through the App before providing them with any personal information.</Text>
        </Section>

        <Section title="10. California Privacy Rights (CCPA)">
          <Text style={styles.body}>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):</Text>
          <Text style={styles.bullet}>- Right to Know: You have the right to request information about the categories and specific pieces of personal information we have collected about you over the past 12 months.</Text>
          <Text style={styles.bullet}>- Right to Delete: You have the right to request deletion of your personal information, subject to certain legal exceptions.</Text>
          <Text style={styles.bullet}>- Right to Opt-Out: You have the right to opt out of the "sale" of your personal information. Note: We do not sell your personal information.</Text>
          <Text style={styles.bullet}>- Right to Non-Discrimination: We will not discriminate against you for exercising your privacy rights.</Text>
        </Section>

        <Section title="11. European Privacy Rights (GDPR)">
          <Text style={styles.body}>If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under the General Data Protection Regulation (GDPR).</Text>
          <Text style={styles.subheading}>11.1 Legal Basis for Processing</Text>
          <Text style={styles.bullet}>- Consent: When you have given clear, informed consent (for example, for marketing communications).</Text>
          <Text style={styles.bullet}>- Contract: When processing is necessary to fulfill our contract with you (for example, providing the App's core features).</Text>
          <Text style={styles.bullet}>- Legitimate Interests: When processing is in our legitimate business interests and not overridden by your rights (for example, analytics and fraud prevention).</Text>
          <Text style={styles.subheading}>11.2 Your Rights</Text>
          <Text style={styles.bullet}>- Access: Request access to your personal data.</Text>
          <Text style={styles.bullet}>- Rectification: Request correction of inaccurate data.</Text>
          <Text style={styles.bullet}>- Erasure: Request deletion of your data ("right to be forgotten").</Text>
          <Text style={styles.bullet}>- Restriction: Request restriction of processing.</Text>
          <Text style={styles.bullet}>- Portability: Request transfer of your data to another service in a machine-readable format.</Text>
          <Text style={styles.bullet}>- Objection: Object to processing based on legitimate interests.</Text>
          <Text style={styles.bullet}>- Withdraw Consent: Withdraw consent at any time where processing is based on consent. Withdrawal does not affect the lawfulness of prior processing.</Text>
          <Text style={styles.subheading}>11.3 Data Protection Contact</Text>
          <Text style={styles.body}>For GDPR-related inquiries, you may contact our designated data protection contact at privacy@callingai.app. We aim to respond to all GDPR requests within 30 days.</Text>
          <Text style={styles.subheading}>11.4 Data Protection Authority</Text>
          <Text style={styles.body}>You have the right to lodge a complaint with a supervisory authority in your country of residence if you believe your data protection rights have been violated.</Text>
        </Section>

        <Section title="12. Changes to This Privacy Policy">
          <Text style={styles.body}>We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date at the top of this document.</Text>
          <Text style={styles.body}>If we make material changes to this Privacy Policy, we will notify you at least 30 days in advance through:</Text>
          <Text style={styles.bullet}>- A prominent notice in the App.</Text>
          <Text style={styles.bullet}>- An email to your registered email address.</Text>
          <Text style={styles.bullet}>- A prominent notice on our website.</Text>
          <Text style={styles.body}>Your continued use of the App after any changes take effect indicates your acceptance of the updated Privacy Policy. If you do not agree with the changes, you should stop using the App and delete your account.</Text>
        </Section>

            <View style={styles.footer}>
              <Text style={styles.footerTitle}>Calling AI</Text>
              <Text style={styles.footerBody}>Social Factory Digital</Text>
              <Text style={styles.footerBody}>Maryland, U.S.</Text>
            </View>
          </>
        )}

        {isRussian && (
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>Calling AI</Text>
            <Text style={styles.footerBody}>Social Factory Digital</Text>
            <Text style={styles.footerBody}>Мэриленд, США</Text>
          </View>
        )}
      </ScrollView>
    </PaperTextureBackground>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#342846',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    ...HeadingStyle,
    fontSize: 20,
    color: '#342846',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  appName: {
    ...HeadingStyle,
    fontSize: 24,
    color: '#342846',
    marginBottom: 6,
  },
  updated: {
    ...BodyStyle,
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#342846',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    ...HeadingStyle,
    fontSize: 18,
    color: '#342846',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  subheading: {
    ...HeadingStyle,
    fontSize: 14,
    color: '#342846',
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  body: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    textTransform: 'none',
  },
  bullet: {
    ...BodyStyle,
    color: '#342846',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textTransform: 'none',
  },
  footer: {
    paddingVertical: 12,
  },
  footerTitle: {
    ...HeadingStyle,
    fontSize: 16,
    color: '#342846',
    textTransform: 'none',
  },
  footerBody: {
    ...BodyStyle,
    fontSize: 14,
    color: '#342846',
    textTransform: 'none',
  },
});
