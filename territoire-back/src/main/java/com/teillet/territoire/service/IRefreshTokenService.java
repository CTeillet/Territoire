package com.teillet.territoire.service;

import com.teillet.territoire.model.User;

public interface IRefreshTokenService {
	/**
	 * Émet un refresh token pour l'utilisateur et l'enregistre comme non consommé.
	 */
	String issue(User user);

	/**
	 * Consomme un refresh token dont la signature, l'expiration et la version ont déjà été vérifiées.
	 * En cas de réutilisation ({@link Usage#REUSED}), toutes les sessions de l'utilisateur sont révoquées.
	 */
	Usage use(String refreshToken, User user);

	/**
	 * Supprime les jetons expirés : ils sont refusés de toute façon, inutile de les garder pour détecter une réutilisation.
	 */
	void purgeExpired();

	enum Usage {
		/** Première utilisation : un nouveau refresh token doit être émis. */
		FIRST_USE,
		/** Consommé il y a quelques secondes (autre onglet) : nouveau jeton d'accès, sans nouveau refresh token. */
		CONCURRENT,
		/** Consommé plus tôt : vol probable, toutes les sessions de l'utilisateur ont été révoquées. */
		REUSED,
		/** Jamais émis par ce serveur. */
		UNKNOWN
	}
}
