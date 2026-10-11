package com.teillet.territoire.repository;

import java.time.LocalDate;

/**
 * Hibernate 6 envoie un paramètre {@code null} à PostgreSQL comme un {@code bytea}, ce qui fait échouer
 * {@code CAST(:date AS date) IS NULL} ("cannot cast type bytea to date"). Les requêtes à dates optionnelles
 * reçoivent donc un drapeau booléen ainsi qu'une date toujours non nulle (sentinelle quand la date est absente).
 */
final class OptionalDates {

	static final LocalDate MIN = LocalDate.of(1900, 1, 1);
	static final LocalDate MAX = LocalDate.of(9999, 12, 31);

	private OptionalDates() {
	}

	static LocalDate startOrMin(LocalDate startDate) {
		return startDate != null ? startDate : MIN;
	}

	static LocalDate endOrMax(LocalDate endDate) {
		return endDate != null ? endDate : MAX;
	}
}
