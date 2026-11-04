package com.teillet.territoire.dto;

import com.teillet.territoire.model.Person;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Création ou modification d'une personne. Le prénom et le nom sont obligatoires ; le téléphone et l'e-mail ne
 * sont pas contrôlés ici, pour ne pas bloquer la modification d'une fiche ancienne (ex. ajout de son numéro).
 * Un éventuel identifiant dans le corps est ignoré : c'est celui du chemin qui compte (cf. PersonService).
 */
@Getter
@Setter
public class PersonRequest {
	@NotBlank(message = "Le prénom est requis")
	@Size(max = 255, message = "Le prénom ne doit pas dépasser 255 caractères")
	private String firstName;

	@NotBlank(message = "Le nom est requis")
	@Size(max = 255, message = "Le nom ne doit pas dépasser 255 caractères")
	private String lastName;

	@Size(max = 255, message = "Le numéro de téléphone ne doit pas dépasser 255 caractères")
	private String phoneNumber;

	@Size(max = 255, message = "L'e-mail ne doit pas dépasser 255 caractères")
	private String email;

	/** Personne correspondante, prénom et nom sans espaces autour. */
	public Person toPerson() {
		return Person.builder()
				.firstName(firstName.strip())
				.lastName(lastName.strip())
				.phoneNumber(phoneNumber)
				.email(email)
				.build();
	}
}
