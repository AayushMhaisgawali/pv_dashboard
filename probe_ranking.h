// ============================================================
// probe_ranking.h — Probe Temperature Ranking Library
// Usage: #include "probe_ranking.h"
//        rank_probes(predicted_temp, probe_temps, flags, n);
// ============================================================
 
#ifndef PROBE_RANKING_H
#define PROBE_RANKING_H
 
#include <vector>
#include <algorithm>
#include <iostream>
#include <iomanip>
 
using namespace std;
 
// ============================================================
// rank_probes()
// Ranks n probe temperatures descending
// Flag 1 = hottest, Flag n = coolest
// ============================================================
void rank_probes(double predicted_temp,
                 double probe_temps[],
                 int    flag[],
                 int    n) {
 
    // Build sortable vector with original index
    vector<pair<double, int>> v;
    for (int i = 0; i < n; i++)
        v.push_back({probe_temps[i], i});
 
    // Sort descending by temperature
    sort(v.begin(), v.end(), greater<pair<double, int>>());
 
    // Assign flags with tie handling
    int currentFlag = 1;
    flag[v[0].second] = currentFlag;
    for (int i = 1; i < n; i++) {
        if (v[i].first < v[i-1].first)
            currentFlag++;
        flag[v[i].second] = currentFlag;
    }
 
    // Print results
    cout << "\nPredicted Temp : " << fixed
         << setprecision(2) << predicted_temp << " C\n";
    cout << "-------------------------------------------\n";
    for (int i = 0; i < n; i++)
        cout << "Probe " << (i+1)
             << " | Temp: " << setw(7) << probe_temps[i] << " C"
             << " | Flag: " << flag[i]
             << (flag[i] == 1 ? "  <- hottest" :
                 flag[i] == n ? "  <- coolest" : "")
             << "\n";
    cout << "-------------------------------------------\n";
}
 
#endif // PROBE_RANKING_H