# Dokument wymagań produktu (PRD) - 10x Cards
## 1. Przegląd produktu
10x Cards to webowa aplikacja wspierająca studentów w systematycznej nauce poprzez automatyzację tworzenia wysokiej jakości fiszek. Produkt umożliwia wklejenie tekstu (do 32 kB), z którego AI generuje do 20 propozycji fiszek ograniczonych do 500 znaków na każdej stronie. Użytkownik może zaakceptować, edytować, odrzucić lub usunąć poszczególne propozycje oraz tworzyć fiszki manualnie. Wszystkie fiszki są prywatne, przypisane do konta użytkownika. MVP rozwija jeden programista full-stack, dlatego wymagania priorytetyzują prostotę wdrożenia przy zachowaniu metryk jakościowych (75% akceptacji kart AI, 75% kart tworzonych z użyciem AI).

## 2. Problem użytkownika
1. Ręczne przygotowywanie fiszek jest czasochłonne, co zniechęca do regularnej nauki metodą spaced repetition.
2. Brak narzędzi skracających proces konwersji notatek do fiszek skutkuje niską jakością materiałów i nieregularnymi powtórkami.
3. Dostępne rozwiązania wymagają zaawansowanej konfiguracji lub instalacji, co stanowi barierę dla studentów oczekujących prostego, webowego narzędzia.
4. Użytkownicy potrzebują kontroli nad treścią fiszek, aby dopasować je do własnych potrzeb i zachować spójność językową.

## 3. Wymagania funkcjonalne
3.1 Generowanie fiszek przez AI
- Użytkownik może wkleić czysty tekst (do 32 kB) i poprosić o wygenerowanie fiszek.
- System zwraca do 20 propozycji fiszek w jednym przebiegu, zachowując limit 500 znaków na froncie i tyle samo na rewersie.
- Każda wygenerowana fiszka otrzymuje status źródła (AI_oryginalna) oraz znacznik czasu utworzenia.

3.2 Workflow przeglądu i akceptacji
- Użytkownik widzi wszystkie propozycje w podglądzie kafelkowym lub tabelarycznym z akcjami akceptacji, edycji, odrzucenia i usunięcia.
- Akceptowane fiszki zapisywane są w kolekcji użytkownika wraz z informacją o pochodzeniu.
- Odrzucenia zwiększają licznik służący do monitorowania metryki akceptacji.
- Po odrzuceniu lub usunięciu fiszka znika z listy propozycji.

3.3 Edycja i ręczne tworzenie fiszek
- Użytkownik może edytować każdą propozycję przed akceptacją; zapis oznacza zmianę statusu na AI_edytowana.
- Ręczne tworzenie fiszek obejmuje pola front/rewers, walidację limitu 500 znaków oraz zapis ze statusem manualna.
- Każda zapisana fiszka jest edytowalna i można ją usunąć w dowolnym momencie.

3.4 Zarządzanie biblioteką fiszek
- Użytkownik ma listę swoich fiszek z możliwością wyszukiwania po treści i filtrowania po statusie pochodzenia.
- System wyświetla źródło, datę ostatniej modyfikacji i historię (tylko ostatnia wersja) dla przejrzystości.
- Użytkownik może wyświetlić szczegóły fiszki.

3.6 System kont użytkowników
- Dane fiszek są separowane między kontami; brak mechanizmów współdzielenia w MVP.

3.7 Telemetria i wskaźniki jakości
- System przechowuje liczbę fiszek zaakceptowanych, edytowanych i odrzuconych dla każdej sesji generowania.
- Każda fiszka przechowuje informację o pochodzeniu (manualna, AI oryginalna, AI edytowana) oraz dacie utworzenia/modyfikacji.
- Dostępny jest widok podsumowujący statystyki na poziomie konta (np. udział fiszek AI vs manualnych, procent akceptacji).

3.8 Walidacje i doświadczenie użytkownika
- Weryfikacja długości tekstu wejściowego oraz pól front/back odbywa się po stronie klienta i serwera.
- System informuje użytkownika o stanie przetwarzania (np. spinner podczas generowania, komunikaty sukcesu/błędu).
- Aplikacja jest responsywna i przystosowana do przeglądarek desktopowych; wsparcie mobilne nie jest wymagane w MVP, ale interfejs powinien być czytelny na mniejszych ekranach.

## 4. Granice produktu
1. Zakres obejmuje: generowanie fiszek z tekstu, manualne tworzenie i edycję, zarządzanie biblioteką, integrację z istniejącym algorytmem powtórek, podstawowe konta użytkowników, telemetrię akceptacji.
2. Poza zakresem: własny algorytm powtórek, import plików (PDF, DOCX itd.), współdzielenie zestawów, integracje z zewnętrznymi platformami edukacyjnymi, aplikacje mobilne, onboarding AI, zaawansowana analityka i wsparcie użytkownika.
3. Ograniczenia techniczne: limit 32 kB dla wejściowego tekstu, limit 500 znaków na stronę fiszki, maksymalnie 20 fiszek na sesję generowania, jeden język per konto.

## 5. Historyjki użytkowników
### US-001
- ID: US-001
- Tytuł: Generowanie propozycji fiszek przez AI
- Opis: Jako student chcę wkleić tekst i otrzymać zestaw fiszek wygenerowanych przez AI, aby szybko przygotować materiał do nauki.
- Kryteria akceptacji:
  - Użytkownik może wkleić tekst do 32 kB i rozpocząć generowanie.
  - System zwraca maksymalnie 20 propozycji z wypełnionymi polami front/rewers.
  - Każda strona fiszki ma maksymalnie 500 znaków; dłuższy tekst jest przycinany lub dzielony przed zapisaniem.
  - Po wygenerowaniu wszystkie fiszki otrzymują status AI oryginalna i są widoczne w podglądzie.

### US-002
- ID: US-002
- Tytuł: Walidacja tekstu wejściowego i obsługa błędów generowania
- Opis: Jako student chcę otrzymać jasną informację, gdy tekst jest zbyt długi lub generowanie się nie powiedzie, aby móc szybko poprawić dane wejściowe.
- Kryteria akceptacji:
  - System blokuje generowanie przy tekście przekraczającym 32 kB i prezentuje komunikat o ograniczeniu.
  - W przypadku pustego lub nieprawidłowego tekstu użytkownik widzi instrukcję poprawnego formatu.
  - Przy błędzie usługi AI użytkownik otrzymuje komunikat z możliwością ponowienia żądania.
  - Żadne niekompletne fiszki nie trafiają do listy propozycji w przypadku błędu.

### US-003
- ID: US-003
- Tytuł: Przegląd i akceptacja propozycji fiszek
- Opis: Jako student chcę szybko przejrzeć i zaakceptować właściwe fiszki, aby dodać je do mojej bazy.
- Kryteria akceptacji:
  - Lista propozycji zawiera podgląd frontu i rewersu dla każdej fiszki.
  - Dla każdej fiszki dostępne są akcje akceptuj, edytuj, odrzuć.
  - Akceptacja zapisuje fiszkę w kolekcji użytkownika i zmienia jej status na AI_oryginalna lub AI_edytowana (jeśli była modyfikowana).
  - Odrzucenie zwiększa licznik odrzuceń i usuwa fiszkę z listy propozycji.

### US-004
- ID: US-004
- Tytuł: Edycja propozycji AI przed akceptacją
- Opis: Jako student chcę poprawić treść fiszki wygenerowanej przez AI przed jej zapisaniem.
- Kryteria akceptacji:
  - Użytkownik może edytować front i rewers każdej propozycji.
  - System waliduje limit 500 znaków w trakcie edycji.
  - Zapis edytowanej fiszki przed akceptacją zmienia status na AI_edytowana.
  - Historia wersji nie jest przechowywana; zapisuje się tylko finalna wersja.

### US-005
- ID: US-005
- Tytuł: Ręczne tworzenie fiszek
- Opis: Jako student chcę stworzyć fiszkę od podstaw, gdy AI nie generuje odpowiednich propozycji.
- Kryteria akceptacji:
  - Formularz tworzenia zawiera pola front i rewers z limitem 500 znaków.
  - Zapis fiszki ustawia status manualna i dodaje ją do kolekcji użytkownika.
  - Po zapisie użytkownik otrzymuje potwierdzenie sukcesu.
  - Formularz informuje o brakujących wymaganych polach.

### US-006
- ID: US-006
- Tytuł: Edycja zapisanej fiszki
- Opis: Jako student chcę modyfikować istniejące fiszki, aby aktualizować treść.
- Kryteria akceptacji:
  - Użytkownik może otworzyć dowolną zapisaną fiszkę i edytować front oraz rewers.
  - System waliduje limit 500 znaków przy zapisie.
  - Po edycji fiszki AI_oryginalnej status zmienia się na AI_edytowana; fiszki manualne zachowują status manualna.
  - Data ostatniej modyfikacji aktualizuje się po zapisie.

### US-007
- ID: US-007
- Tytuł: Usuwanie fiszek
- Opis: Jako student chcę usuwać fiszki, które są niepotrzebne, aby utrzymać porządek w bazie.
- Kryteria akceptacji:
  - Użytkownik może rozpocząć usuwanie z poziomu listy lub widoku szczegółów fiszki.
  - Przed usunięciem wyświetlane jest potwierdzenie.
  - Po usunięciu fiszka znika z biblioteki i nie pojawia się w powtórkach.
  - System aktualizuje statystyki liczby fiszek po usunięciu.

### US-008
- ID: US-008
- Tytuł: Przeglądanie biblioteki fiszek
- Opis: Jako student chcę przeglądać wszystkie fiszki w jednym miejscu, aby zarządzać materiałem do nauki.
- Kryteria akceptacji:
  - Widok biblioteki prezentuje listę fiszek z frontem, źródłem, datą modyfikacji.
  - Dostępne są filtry po statusie pochodzenia oraz wyszukiwarka tekstowa.
  - Użytkownik może otworzyć szczegóły fiszki bez opuszczania widoku.
  - Wskaźniki liczby fiszek (łącznie, AI, manualne) są prezentowane w nagłówku.

### US-009
- ID: US-009
- Tytuł: Synchronizacja fiszek z algorytmem powtórek
- Opis: Jako student chcę, aby zaakceptowane fiszki trafiały do modułu powtórek, aby móc je od razu ćwiczyć.
- Kryteria akceptacji:
  - Każda zaakceptowana lub ręcznie utworzona fiszka jest przekazywana do istniejącego algorytmu powtórek.
  - Użytkownik może zainicjować sesję powtórek i otrzymać fiszki zgodnie z harmonogramem.
  - Po zakończeniu sesji wyniki są zapisywane w module powtórek.
  - Jeśli moduł powtórek jest niedostępny, użytkownik otrzymuje komunikat i fiszki zostają w kolejce do synchronizacji.

### US-010
- ID: US-010
- Tytuł: Bezpieczny dostęp do prywatnych fiszek
- Opis: Jako student chcę logować się do aplikacji przy użyciu własnych danych, aby moje fiszki były prywatne i chronione.
- Kryteria akceptacji:
  - Użytkownik może utworzyć konto (e-mail i hasło) lub otrzymać bezpieczny link dostępu.
  - Hasła są przechowywane w postaci zaszyfrowanej, a sesje wygasają po określonym czasie bezczynności.
  - Po zalogowaniu użytkownik ma dostęp wyłącznie do własnych fiszek.
  - Wylogowanie czyści dane sesji po stronie klienta i serwera.

### US-011
- ID: US-011
- Tytuł: Monitorowanie jakości fiszek AI
- Opis: Jako właściciel produktu chcę śledzić liczbę zaakceptowanych, edytowanych i odrzuconych fiszek, aby mierzyć jakość generacji AI.
- Kryteria akceptacji:
  - System przechowuje liczbę fiszek zaakceptowanych, edytowanych i odrzuconych w ramach każdej sesji generowania.
  - Widok statystyk prezentuje procent akceptacji fiszek AI oraz udział fiszek tworzonych z użyciem AI względem manualnych.
  - Dane można filtrować po użytkowniku i przedziale czasowym (przynajmniej miesięcznym).
  - Dane eksportowane są w formacie CSV lub JSON na potrzeby dalszej analizy (opcjonalne w MVP, ale struktura przechowywania musi to uwzględniać).

### US-012
- ID: US-012
- Tytuł: Informowanie użytkownika o stanie systemu
- Opis: Jako student chcę widzieć aktualny stan operacji (ładowanie, sukces, błąd), aby rozumieć, co dzieje się z moimi fiszkami.
- Kryteria akceptacji:
  - Podczas generowania AI wyświetlany jest stan przetwarzania, który znika po zakończeniu.
  - Po sukcesie użytkownik otrzymuje potwierdzenie (toast, baner) z możliwością przejścia do biblioteki.
  - Błędy są prezentowane w formie czytelnych komunikatów z możliwością ponowienia akcji.
  - Wszystkie komunikaty są dostępne dla czytników ekranu (aria-live).

## 6. Metryki sukcesu
1. 75% fiszek wygenerowanych przez AI zostaje zaakceptowanych przez użytkowników (liczone jako liczba zaakceptowanych fiszek AI / liczba wszystkich wygenerowanych fiszek AI).
2. Użytkownicy tworzą 75% fiszek z wykorzystaniem AI (liczone jako liczba fiszek AI oryginalnych + AI edytowanych / liczba wszystkich utworzonych fiszek).
