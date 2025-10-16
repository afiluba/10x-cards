# 10x Cards

![Status](https://img.shields.io/badge/status-MVP%20w%20trakcie%20prac-orange) ![Version](https://img.shields.io/badge/version-0.0.1-blue) ![Node](https://img.shields.io/badge/node-22.14.0-43853d) ![License](https://img.shields.io/badge/license-MIT-green)

> Przekształć surowe notatki w dopracowane zestawy fiszek dzięki generowaniu wspomaganemu przez AI, ręcznej kuracji i wsparciu algorytmu powtórek.

## Spis treści
- [1. Nazwa projektu](#1-nazwa-projektu)
- [2. Opis projektu](#2-opis-projektu)
- [3. Stos technologiczny](#3-stos-technologiczny)
- [4. Uruchomienie lokalne](#4-uruchomienie-lokalne)
- [5. Dostępne skrypty](#5-dostępne-skrypty)
- [6. Zakres projektu](#6-zakres-projektu)
- [7. Status projektu](#7-status-projektu)
- [8. Licencja](#8-licencja)

## 1. Nazwa projektu
- **10x Cards** — aplikacja do tworzenia fiszek z pomocą AI, która stawia na szybkość, jakość i mierzalne wyniki nauki.

## 2. Opis projektu
- Wklej tekst źródłowy o rozmiarze do 32 KB, aby wygenerować maksymalnie 20 propozycji fiszek, z limitem 500 znaków na każdej stronie.
- Selekcjonuj propozycje w dedykowanym widoku: akceptuj, edytuj, odrzucaj lub usuwaj przed zapisaniem w prywatnej bibliotece.
- Twórz, edytuj i usuwaj ręczne fiszki współistniejące z tymi wygenerowanymi przez AI.
- Uwierzytelniaj się przy pomocy Supabase, aby fiszki pozostawały prywatne dla danego konta użytkownika.
- Synchronizuj zatwierdzone fiszki z zewnętrznym algorytmem powtórek i monitoruj wskaźniki akceptacji, edycji oraz odrzuceń dla oceny jakości AI.

## 3. Stos technologiczny
- **Frontend:** Astro 5, React 19, TypeScript 5, Tailwind CSS 4, komponenty shadcn/ui.
- **Backend i uwierzytelnianie:** Supabase (PostgreSQL, moduły auth, narzędzia do przechowywania danych).
- **Integracja AI:** OpenRouter.ai zapewniający dostęp do szerokiego katalogu dostawców modeli LLM.
- **Narzędzia i CI/CD:** Node.js 22.14.0, npm, ESLint, Prettier, Husky, lint-staged, GitHub Actions, wdrożenia kontenerowe na DigitalOcean.
- **Testowanie:** Vitest (testy jednostkowe i integracyjne), Playwright (testy E2E), React Testing Library (testy komponentów React).
- **Biblioteki UI i narzędzia:** @astrojs/node, @astrojs/react, class-variance-authority, clsx, lucide-react, tailwind-merge, tw-animate-css.

## 4. Uruchomienie lokalne
**Wymagania wstępne**
- Node.js 22.14.0 (plik `.nvmrc`) oraz npm.
- Poświadczenia projektu Supabase i klucz API OpenRouter.

**Konfiguracja**
1. Sklonuj repozytorium:
   ```bash
   git clone https://github.com/<twoja-organizacja>/10x-cards.git
   cd 10x-cards
   ```
2. Zainstaluj zależności:
   ```bash
   npm install
   ```
3. Skonfiguruj zmienne środowiskowe:
   - Utwórz plik `.env` (lub `.env.local`) z `SUPABASE_URL`, `SUPABASE_ANON_KEY`, opcjonalnymi kluczami roli serwisowej oraz `OPENROUTER_API_KEY`.
   - Dodaj dane telemetryczne, jeśli eksportujesz metryki.
4. Uruchom serwer deweloperski:
   ```bash
   npm run dev
   ```
5. Zbuduj i podglądaj produkcję (opcjonalnie):
   ```bash
   npm run build
   npm run preview
   ```

## 5. Dostępne skrypty
- `npm run dev` — uruchamia serwer deweloperski Astro z przeładowaniem na żywo.
- `npm run build` — generuje zoptymalizowaną wersję produkcyjną.
- `npm run preview` — umożliwia lokalny podgląd zbudowanej aplikacji.
- `npm run lint` — uruchamia ESLint dla plików `.ts`, `.tsx` i `.astro`.
- `npm run lint:fix` — próbuje automatycznie naprawić problemy wykryte przez ESLint.
- `npm run format` — formatuje pliki wspierane przez Prettiera.

## 6. Zakres projektu
- **W zakresie:** Generowanie i przegląd fiszek wspomagany AI, ręczne zarządzanie fiszkami, konta użytkowników oparte na Supabase, filtry/wyszukiwanie w bibliotece, integracja z algorytmem powtórek, telemetryka akceptacji AI, responsywny interfejs webowy.
- **Poza zakresem (MVP):** Własny algorytm powtórek, współdzielone/publiczne talie, import dokumentów (PDF/DOCX), aplikacje mobilne, zaawansowane powiadomienia, publiczne API, integracje z zewnętrznymi platformami edukacyjnymi, rozbudowane pulpity analityczne, onboarding AI, dedykowane narzędzia wsparcia.
- **Kluczowe ograniczenia:** Tekst wejściowy ≤32 KB, każda strona fiszki ≤500 znaków, ≤20 fiszek na jedną sesję generowania, jeden język na konto, przejrzyste komunikaty o stanie operacji asynchronicznych.
- **Cele sukcesu:** ≥75% fiszek generowanych przez AI zaakceptowanych; ≥75% nowych fiszek tworzonych z użyciem AI (oryginalnych lub edytowanych); zliczanie akceptacji/edycji/odrzuceń w każdej sesji generowania dla monitoringu jakości.

## 7. Status projektu
- MVP jest aktywnie rozwijane przez jednego inżyniera full-stack.
- Kluczowe wymagania są udokumentowane w `.ai/prd.md`; prace obejmują moduły generowania, przeglądu, telemetryki i powtórek.

## 8. Licencja
- Licencja MIT. Przed publicznym wydaniem dodaj plik `LICENSE`, aby sformalizować dystrybucję.
