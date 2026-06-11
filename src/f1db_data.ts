// F1DB Historical Archive (1950 - 2025/2026 Season Records)

export interface HistoricChampion {
  year: number;
  driver: string;
  nationality: string;
  team: string;
  wins: number;
  points: number;
  ratio: string;
}

export interface ConstructorChampion {
  year: number;
  team: string;
  points: number;
  wins: number;
  engine: string;
}

export interface F1DBRecord {
  category: string;
  title: string;
  holder: string;
  value: string;
  description: string;
}

export const HISTORIC_DRIVERS: HistoricChampion[] = [
  { year: 2025, driver: "Max Verstappen", nationality: "Netherlands", team: "Red Bull Racing", wins: 9, points: 437, ratio: "37.5%" },
  { year: 2024, driver: "Max Verstappen", nationality: "Netherlands", team: "Red Bull Racing", wins: 15, points: 575, ratio: "65.2%" },
  { year: 2023, driver: "Max Verstappen", nationality: "Netherlands", team: "Red Bull Racing", wins: 19, points: 575, ratio: "86.3%" },
  { year: 2022, driver: "Max Verstappen", nationality: "Netherlands", team: "Red Bull Racing", wins: 15, points: 454, ratio: "68.1%" },
  { year: 2021, driver: "Max Verstappen", nationality: "Netherlands", team: "Red Bull Racing", wins: 10, points: 395.5, ratio: "45.4%" },
  { year: 2020, driver: "Lewis Hamilton", nationality: "United Kingdom", team: "Mercedes", wins: 11, points: 347, ratio: "64.7%" },
  { year: 2019, driver: "Lewis Hamilton", nationality: "United Kingdom", team: "Mercedes", wins: 11, points: 413, ratio: "52.3%" },
  { year: 2018, driver: "Lewis Hamilton", nationality: "United Kingdom", team: "Mercedes", wins: 11, points: 408, ratio: "52.3%" },
  { year: 2017, driver: "Lewis Hamilton", nationality: "United Kingdom", team: "Mercedes", wins: 9, points: 363, ratio: "45.0%" },
  { year: 2016, driver: "Nico Rosberg", nationality: "Germany", team: "Mercedes", wins: 9, points: 385, ratio: "42.8%" },
  { year: 2015, driver: "Lewis Hamilton", nationality: "United Kingdom", team: "Mercedes", wins: 10, points: 381, ratio: "52.6%" },
  { year: 2014, driver: "Lewis Hamilton", nationality: "United Kingdom", team: "Mercedes", wins: 11, points: 384, ratio: "57.8%" },
  { year: 2013, driver: "Sebastian Vettel", nationality: "Germany", team: "Red Bull Racing", wins: 13, points: 397, ratio: "68.4%" },
  { year: 2012, driver: "Sebastian Vettel", nationality: "Germany", team: "Red Bull Racing", wins: 5, points: 281, ratio: "25.0%" },
  { year: 2011, driver: "Sebastian Vettel", nationality: "Germany", team: "Red Bull Racing", wins: 11, points: 392, ratio: "57.8%" },
  { year: 2010, driver: "Sebastian Vettel", nationality: "Germany", team: "Red Bull Racing", wins: 5, points: 256, ratio: "26.3%" },
  { year: 2009, driver: "Jenson Button", nationality: "United Kingdom", team: "Brawn GP", wins: 6, points: 95, ratio: "35.2%" },
  { year: 2008, driver: "Lewis Hamilton", nationality: "United Kingdom", team: "McLaren", wins: 5, points: 98, ratio: "27.7%" },
  { year: 2007, driver: "Kimi Räikkönen", nationality: "Finland", team: "Ferrari", wins: 6, points: 110, ratio: "35.2%" },
  { year: 2006, driver: "Fernando Alonso", nationality: "Spain", team: "Renault", wins: 7, points: 134, ratio: "38.8%" },
  { year: 2005, driver: "Fernando Alonso", nationality: "Spain", team: "Renault", wins: 7, points: 133, ratio: "36.8%" },
  { year: 2004, driver: "Michael Schumacher", nationality: "Germany", team: "Ferrari", wins: 13, points: 148, ratio: "72.2%" },
  { year: 2003, driver: "Michael Schumacher", nationality: "Germany", team: "Ferrari", wins: 6, points: 93, ratio: "37.5%" },
  { year: 2002, driver: "Michael Schumacher", nationality: "Germany", team: "Ferrari", wins: 11, points: 144, ratio: "64.7%" },
  { year: 2001, driver: "Michael Schumacher", nationality: "Germany", team: "Ferrari", wins: 9, points: 123, ratio: "52.9%" },
  { year: 2000, driver: "Michael Schumacher", nationality: "Germany", team: "Ferrari", wins: 9, points: 108, ratio: "52.9%" },
  { year: 1999, driver: "Mika Häkkinen", nationality: "Finland", team: "McLaren", wins: 5, points: 76, ratio: "31.2%" },
  { year: 1998, driver: "Mika Häkkinen", nationality: "Finland", team: "McLaren", wins: 8, points: 100, ratio: "50.0%" },
  { year: 1997, driver: "Jacques Villeneuve", nationality: "Canada", team: "Williams", wins: 7, points: 81, ratio: "41.1%" },
  { year: 1996, driver: "Damon Hill", nationality: "United Kingdom", team: "Williams", wins: 8, points: 97, ratio: "50.0%" },
  { year: 1995, driver: "Michael Schumacher", nationality: "Germany", team: "Benetton", wins: 9, points: 102, ratio: "52.9%" },
  { year: 1994, driver: "Michael Schumacher", nationality: "Germany", team: "Benetton", wins: 8, points: 92, ratio: "50.0%" },
  { year: 1993, driver: "Alain Prost", nationality: "France", team: "Williams", wins: 7, points: 99, ratio: "43.7%" },
  { year: 1992, driver: "Nigel Mansell", nationality: "United Kingdom", team: "Williams", wins: 9, points: 108, ratio: "56.2%" },
  { year: 1991, driver: "Ayrton Senna", nationality: "Brazil", team: "McLaren", wins: 7, points: 96, ratio: "43.7%" },
  { year: 1990, driver: "Ayrton Senna", nationality: "Brazil", team: "McLaren", wins: 6, points: 78, ratio: "37.5%" },
  { year: 1889, driver: "Alain Prost", nationality: "France", team: "McLaren", wins: 4, points: 76, ratio: "25.0%" },
  { year: 1988, driver: "Ayrton Senna", nationality: "Brazil", team: "McLaren", wins: 8, points: 90, ratio: "50.0%" },
  { year: 1987, driver: "Nelson Piquet", nationality: "Brazil", team: "Williams", wins: 3, points: 73, ratio: "18.7%" },
  { year: 1986, driver: "Alain Prost", nationality: "France", team: "McLaren", wins: 4, points: 72, ratio: "25.0%" },
  { year: 1985, driver: "Alain Prost", nationality: "France", team: "McLaren", wins: 5, points: 73, ratio: "31.2%" },
  { year: 1984, driver: "Niki Lauda", nationality: "Austria", team: "McLaren", wins: 5, points: 72, ratio: "31.2%" },
  { year: 1983, driver: "Nelson Piquet", nationality: "Brazil", team: "Brabham", wins: 3, points: 59, ratio: "20.0%" },
  { year: 1982, driver: "Keke Rosberg", nationality: "Finland", team: "Williams", wins: 1, points: 44, ratio: "6.2%" },
  { year: 1981, driver: "Nelson Piquet", nationality: "Brazil", team: "Brabham", wins: 3, points: 50, ratio: "20.0%" },
  { year: 1980, driver: "Alan Jones", nationality: "Australia", team: "Williams", wins: 5, points: 67, ratio: "35.7%" },
  { year: 1979, driver: "Jody Scheckter", nationality: "South Africa", team: "Ferrari", wins: 3, points: 51, ratio: "20.0%" },
  { year: 1978, driver: "Mario Andretti", nationality: "United States", team: "Lotus", wins: 6, points: 64, ratio: "37.5%" },
  { year: 1977, driver: "Niki Lauda", nationality: "Austria", team: "Ferrari", wins: 3, points: 72, ratio: "17.6%" },
  { year: 1976, driver: "James Hunt", nationality: "United Kingdom", team: "Lotus", wins: 6, points: 69, ratio: "37.5%" },
  { year: 1975, driver: "Niki Lauda", nationality: "Austria", team: "Ferrari", wins: 5, points: 64.5, ratio: "35.7%" },
  { year: 1974, driver: "Emerson Fittipaldi", nationality: "Brazil", team: "McLaren", wins: 3, points: 55, ratio: "20.0%" },
  { year: 1973, driver: "Jackie Stewart", nationality: "United Kingdom", team: "Tyrrell", wins: 5, points: 71, ratio: "33.3%" },
  { year: 1972, driver: "Emerson Fittipaldi", nationality: "Brazil", team: "Lotus", wins: 5, points: 61, ratio: "41.6%" },
  { year: 1971, driver: "Jackie Stewart", nationality: "United Kingdom", team: "Tyrrell", wins: 6, points: 62, ratio: "54.5%" },
  { year: 1970, driver: "Jochen Rindt", nationality: "Austria", team: "Lotus", wins: 5, points: 45, ratio: "38.4%" },
  { year: 1969, driver: "Jackie Stewart", nationality: "United Kingdom", team: "Matra", wins: 6, points: 63, ratio: "54.5%" },
  { year: 1968, driver: "Graham Hill", nationality: "United Kingdom", team: "Lotus", wins: 3, points: 48, ratio: "25.0%" },
  { year: 1967, driver: "Denny Hulme", nationality: "New Zealand", team: "Brabham", wins: 2, points: 51, ratio: "18.1%" },
  { year: 1966, driver: "Jack Brabham", nationality: "Australia", team: "Brabham", wins: 4, points: 42, ratio: "44.4%" },
  { year: 1965, driver: "Jim Clark", nationality: "United Kingdom", team: "Lotus", wins: 6, points: 54, ratio: "60.0%" },
  { year: 1964, driver: "John Surtees", nationality: "United Kingdom", team: "Ferrari", wins: 2, points: 40, ratio: "20.0%" },
  { year: 1963, driver: "Jim Clark", nationality: "United Kingdom", team: "Lotus", wins: 7, points: 54, ratio: "70.0%" },
  { year: 1962, driver: "Graham Hill", nationality: "United Kingdom", team: "BRM", wins: 4, points: 42, ratio: "44.4%" },
  { year: 1961, driver: "Phil Hill", nationality: "United States", team: "Ferrari", wins: 2, points: 34, ratio: "25.0%" },
  { year: 1960, driver: "Jack Brabham", nationality: "Australia", team: "Cooper", wins: 5, points: 43, ratio: "50.0%" },
  { year: 1959, driver: "Jack Brabham", nationality: "Australia", team: "Cooper", wins: 2, points: 31, ratio: "22.2%" },
  { year: 1958, driver: "Mike Hawthorn", nationality: "United Kingdom", team: "Ferrari", wins: 1, points: 42, ratio: "9.0%" },
  { year: 1957, driver: "Juan Manuel Fangio", nationality: "Argentina", team: "Maserati", wins: 4, points: 40, ratio: "50.0%" },
  { year: 1956, driver: "Juan Manuel Fangio", nationality: "Argentina", team: "Ferrari", wins: 3, points: 30, ratio: "37.5%" },
  { year: 1955, driver: "Juan Manuel Fangio", nationality: "Argentina", team: "Mercedes", wins: 4, points: 40, ratio: "57.1%" },
  { year: 1954, driver: "Juan Manuel Fangio", nationality: "Argentina", team: "Maserati / Mercedes", wins: 6, points: 42, ratio: "66.6%" },
  { year: 1953, driver: "Alberto Ascari", nationality: "Italy", team: "Ferrari", wins: 5, points: 34.5, ratio: "55.5%" },
  { year: 1952, driver: "Alberto Ascari", nationality: "Italy", team: "Ferrari", wins: 6, points: 36, ratio: "75.0%" },
  { year: 1951, driver: "Juan Manuel Fangio", nationality: "Argentina", team: "Alfa Romeo", wins: 3, points: 31, ratio: "37.5%" },
  { year: 1950, driver: "Giuseppe Farina", nationality: "Italy", team: "Alfa Romeo", wins: 3, points: 30, ratio: "42.8%" }
];

export const HISTORIC_CONSTRUCTORS: ConstructorChampion[] = [
  { year: 2025, team: "McLaren", points: 641, wins: 8, engine: "Mercedes" },
  { year: 2024, team: "McLaren", points: 651, wins: 5, engine: "Mercedes" },
  { year: 2023, team: "Red Bull Racing", points: 860, wins: 21, engine: "Honda RBPT" },
  { year: 2022, team: "Red Bull Racing", points: 759, wins: 17, engine: "Honda RBPT" },
  { year: 2021, team: "Mercedes", points: 613.5, wins: 9, engine: "Mercedes" },
  { year: 2020, team: "Mercedes", points: 573, wins: 13, engine: "Mercedes" },
  { year: 2019, team: "Mercedes", points: 739, wins: 15, engine: "Mercedes" },
  { year: 2018, team: "Mercedes", points: 655, wins: 11, engine: "Mercedes" },
  { year: 2017, team: "Mercedes", points: 668, wins: 12, engine: "Mercedes" },
  { year: 2016, team: "Mercedes", points: 765, wins: 19, engine: "Mercedes" },
  { year: 2015, team: "Mercedes", points: 703, wins: 16, engine: "Mercedes" },
  { year: 2014, team: "Mercedes", points: 701, wins: 16, engine: "Mercedes" },
  { year: 2013, team: "Red Bull Racing", points: 596, wins: 13, engine: "Renault" },
  { year: 2012, team: "Red Bull Racing", points: 460, wins: 7, engine: "Renault" },
  { year: 2011, team: "Red Bull Racing", points: 650, wins: 12, engine: "Renault" },
  { year: 2010, team: "Red Bull Racing", points: 498, wins: 9, engine: "Renault" },
  { year: 2009, team: "Brawn GP", points: 172, wins: 8, engine: "Mercedes" },
  { year: 2008, team: "Ferrari", points: 172, wins: 8, engine: "Ferrari" },
  { year: 2007, team: "Ferrari", points: 204, wins: 9, engine: "Ferrari" },
  { year: 2006, team: "Renault", points: 206, wins: 8, engine: "Renault" },
  { year: 2005, team: "Renault", points: 191, wins: 8, engine: "Renault" },
  { year: 2004, team: "Ferrari", points: 262, wins: 15, engine: "Ferrari" },
  { year: 2003, team: "Ferrari", points: 158, wins: 8, engine: "Ferrari" },
  { year: 2002, team: "Ferrari", points: 221, wins: 15, engine: "Ferrari" },
  { year: 2001, team: "Ferrari", points: 179, wins: 9, engine: "Ferrari" },
  { year: 2000, team: "Ferrari", points: 170, wins: 10, engine: "Ferrari" },
  { year: 1999, team: "Ferrari", points: 128, wins: 6, engine: "Ferrari" },
  { year: 1998, team: "McLaren", points: 156, wins: 9, engine: "Mercedes" },
  { year: 1997, team: "Williams", points: 123, wins: 8, engine: "Renault" },
  { year: 1996, team: "Williams", points: 175, wins: 12, engine: "Renault" },
  { year: 1995, team: "Benetton", points: 137, wins: 11, engine: "Renault" },
  { year: 1994, team: "Williams", points: 118, wins: 7, engine: "Renault" },
  { year: 1993, team: "Williams", points: 168, wins: 10, engine: "Renault" },
  { year: 1992, team: "Williams", points: 164, wins: 10, engine: "Renault" },
  { year: 1991, team: "McLaren", points: 139, wins: 8, engine: "Honda" },
  { year: 1990, team: "McLaren", points: 121, wins: 6, engine: "Honda" },
  { year: 1958, team: "Vanwall", points: 48, wins: 6, engine: "Vanwall" }
];

export const ALL_TIME_STATS: F1DBRecord[] = [
  { category: "Победы (Гонки)", title: "Наибольшее число побед", holder: "Lewis Hamilton", value: "103 победы", description: "Удерживает вселенский рекорд. Ближайший преследователь — Михаэль Шумахер со 91 победой, далее Макс Ферстаппен." },
  { category: "Квалификация", title: "Наибольшее число Поул-позиций", holder: "Lewis Hamilton", value: "104 поула", description: "Абсолютный лидер в субботних сессиях. Второй в списке — Айртон Сенна с 65 поулами." },
  { category: "Чемпионаты", title: "Наибольшее количество титулов", holder: "Michael Schumacher / Lewis Hamilton", value: "7 титулов", description: "Легендарное равенство. Михаэль завоевал титулы с Benetton и Ferrari, Льюис — с McLaren и Mercedes." },
  { category: "Конструкторы", title: "Самая успешная команда", holder: "Scuderia Ferrari", value: "16 кубков", description: "Итальянская скудерия является рекордсменом по числу Кубков конструкторов с 1958 года." },
  { category: "Скорость", title: "Максимальная скорость в гонке", holder: "Valtteri Bottas", value: "378.0 км/ч", description: "Рекорд установлен на Гран-при Азербайджана 2016 (Баку) на машине Williams с мотором Mercedes." },
  { category: "Возраст", title: "Самый молодой победитель Гран-при", holder: "Max Verstappen", value: "18 лет 228 дней", description: "Установил этот рекорд при дебюте за Red Bull на Гран-при Испании 2016." },
  { category: "Быстрый круг", title: "Быстрейший круг в истории (средний темп)", holder: "Lewis Hamilton", value: "264.362 км/ч", description: "Установлен во время квалификации в Монце в 2020 году на болиде Mercedes W11 (время 1:18.887)." }
];
