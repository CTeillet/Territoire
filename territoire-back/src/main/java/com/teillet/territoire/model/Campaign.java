package com.teillet.territoire.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Campaign {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    private String name;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean closed;

    @ManyToMany
    @JoinTable(
        name = "campaign_territory",
        joinColumns = @JoinColumn(name = "campaign_id"),
        inverseJoinColumns = @JoinColumn(name = "territory_id")
    )
    private List<Territory> territories = new ArrayList<>();

    @ManyToMany
    @JoinTable(
        name = "campaign_remaining_territory",
        joinColumns = @JoinColumn(name = "campaign_id"),
        inverseJoinColumns = @JoinColumn(name = "territory_id")
    )
    private List<Territory> remainingTerritories = new ArrayList<>();

    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference(value = "campaign-assignments")
    private List<Assignment> assignments = new ArrayList<>();

    @Override
    public String toString() {
        return "Campaign{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", startDate=" + startDate +
                ", endDate=" + endDate +
                ", closed=" + closed +
                ", territories=" + territories.size() +
                ", remainingTerritories=" + remainingTerritories.size() +
                ", assignments=" + assignments.size() +
                '}';
    }
}
